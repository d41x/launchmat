import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs-extra";
import * as path from "path";
import * as plist from "plist";
import { Application, ApplicationScanResult } from "../types";

const execAsync = promisify(exec);

export class ApplicationScanner {
  private readonly applicationsPath = "/Applications";
  private readonly userApplicationsPath = path.join(process.env.HOME!, "Applications");

  async scanApplications(): Promise<Application[]> {
    const applications: Application[] = [];
    
    try {
      // Scan system Applications folder
      const systemApps = await this.scanApplicationsInDirectory(this.applicationsPath);
      applications.push(...systemApps);

      // Scan user Applications folder if it exists
      if (await fs.pathExists(this.userApplicationsPath)) {
        const userApps = await this.scanApplicationsInDirectory(this.userApplicationsPath);
        applications.push(...userApps);
      }

      // Remove duplicates and sort by name
      const uniqueApps = this.removeDuplicates(applications);
      return uniqueApps.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error("Error scanning applications:", error);
      return [];
    }
  }

  private async scanApplicationsInDirectory(directoryPath: string): Promise<Application[]> {
    const applications: Application[] = [];

    try {
      const entries = await fs.readdir(directoryPath);
      
      for (const entry of entries) {
        if (!entry.endsWith('.app')) continue;
        
        const appPath = path.join(directoryPath, entry);
        const application = await this.parseApplication(appPath);
        
        if (application) {
          applications.push(application);
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${directoryPath}:`, error);
    }

    return applications;
  }

  private async parseApplication(appPath: string): Promise<Application | null> {
    try {
      const appName = path.basename(appPath, '.app');
      const infoPlistPath = path.join(appPath, 'Contents', 'Info.plist');
      
      if (!(await fs.pathExists(infoPlistPath))) {
        // Fallback for apps without Info.plist
        return this.createFallbackApplication(appPath, appName);
      }

      const plistContent = await fs.readFile(infoPlistPath, 'utf8');
      const plistData = plist.parse(plistContent) as any;

      const stats = await fs.stat(appPath);
      
      return {
        id: this.generateAppId(appPath),
        name: plistData.CFBundleDisplayName || plistData.CFBundleName || appName,
        bundleIdentifier: plistData.CFBundleIdentifier || `unknown.${appName}`,
        path: appPath,
        version: plistData.CFBundleShortVersionString || plistData.CFBundleVersion,
        icon: await this.extractIconPath(appPath, plistData),
        category: await this.categorizeApplication(plistData),
        lastModified: stats.mtime.toISOString(),
        size: await this.calculateAppSize(appPath),
      };
    } catch (error) {
      console.error(`Error parsing application at ${appPath}:`, error);
      return null;
    }
  }

  private createFallbackApplication(appPath: string, appName: string): Application {
    return {
      id: this.generateAppId(appPath),
      name: appName,
      bundleIdentifier: `unknown.${appName}`,
      path: appPath,
      lastModified: new Date().toISOString(),
      category: "Other",
    };
  }

  private generateAppId(appPath: string): string {
    // Create a stable ID based on app path
    return Buffer.from(appPath).toString('base64').replace(/[/+=]/g, '');
  }

  private async extractIconPath(appPath: string, plistData: any): Promise<string | undefined> {
    try {
      const iconFileName = plistData.CFBundleIconFile;
      if (!iconFileName) return undefined;

      const resourcesPath = path.join(appPath, 'Contents', 'Resources');
      const iconPath = path.join(resourcesPath, iconFileName.endsWith('.icns') ? iconFileName : `${iconFileName}.icns`);
      
      if (await fs.pathExists(iconPath)) {
        return iconPath;
      }
    } catch (error) {
      console.error(`Error extracting icon for ${appPath}:`, error);
    }
    return undefined;
  }

  private async categorizeApplication(plistData: any): Promise<string> {
    const bundleId = plistData.CFBundleIdentifier?.toLowerCase() || '';
    const category = plistData.LSApplicationCategoryType || '';

    // Common app categorization logic
    const categoryMap: Record<string, string[]> = {
      "Productivity": ["office", "document", "text", "note", "task", "calendar"],
      "Development": ["xcode", "code", "terminal", "git", "developer"],
      "Graphics": ["photo", "image", "design", "sketch", "figma", "adobe"],
      "Entertainment": ["music", "video", "media", "netflix", "spotify"],
      "Communication": ["mail", "message", "slack", "discord", "zoom"],
      "Utilities": ["utility", "system", "clean", "monitor", "activity"],
      "Games": ["game"],
      "Finance": ["bank", "finance", "money", "budget"],
      "Social": ["social", "facebook", "twitter", "instagram"],
    };

    for (const [cat, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => bundleId.includes(keyword))) {
        return cat;
      }
    }

    if (category.includes('productivity')) return "Productivity";
    if (category.includes('graphics')) return "Graphics";
    if (category.includes('utility')) return "Utilities";
    if (category.includes('game')) return "Games";
    
    return "Other";
  }

  private async calculateAppSize(appPath: string): Promise<number> {
    try {
      const { stdout } = await execAsync(`du -sk "${appPath}"`);
      const sizeInKB = parseInt(stdout.split('\t')[0]);
      return sizeInKB * 1024; // Convert to bytes
    } catch (error) {
      return 0;
    }
  }

  private removeDuplicates(applications: Application[]): Application[] {
    const seen = new Set<string>();
    return applications.filter(app => {
      const key = app.bundleIdentifier || app.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async launchApplication(app: Application): Promise<void> {
    try {
      await execAsync(`open -a "${app.path}"`);
    } catch (error) {
      throw new Error(`Failed to launch ${app.name}: ${error}`);
    }
  }

  async showInFinder(app: Application): Promise<void> {
    try {
      await execAsync(`open -R "${app.path}"`);
    } catch (error) {
      throw new Error(`Failed to show ${app.name} in Finder: ${error}`);
    }
  }

  async getApplicationInfo(app: Application): Promise<void> {
    try {
      await execAsync(`open -b com.apple.finder "${app.path}"`);
    } catch (error) {
      throw new Error(`Failed to get info for ${app.name}: ${error}`);
    }
  }

  async compareApplications(
    currentApps: Application[], 
    previousApps: Application[]
  ): Promise<ApplicationScanResult> {
    const currentIds = new Set(currentApps.map(app => app.id));
    const previousIds = new Set(previousApps.map(app => app.id));

    const newApplications = currentApps.filter(app => !previousIds.has(app.id));
    const removedApplications = Array.from(previousIds).filter(id => !currentIds.has(id));

    return {
      applications: currentApps,
      newApplications,
      removedApplications,
    };
  }
}