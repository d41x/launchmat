import { LocalStorage } from "@raycast/api";
import { LaunchmatFolder, Application, LaunchmatSettings } from "../types";

export class StorageManager {
  private readonly STORAGE_KEY_FOLDERS = "launchmat_folders";
  private readonly STORAGE_KEY_SETTINGS = "launchmat_settings";
  private readonly STORAGE_KEY_APP_MAPPINGS = "launchmat_app_mappings";
  private readonly STORAGE_KEY_LAST_SCAN = "launchmat_last_scan";

  async loadFolders(): Promise<LaunchmatFolder[]> {
    try {
      const foldersData = await LocalStorage.getItem<string>(this.STORAGE_KEY_FOLDERS);
      if (!foldersData) {
        return this.createDefaultFolders();
      }
      return JSON.parse(foldersData);
    } catch (error) {
      console.error("Error loading folders:", error);
      return this.createDefaultFolders();
    }
  }

  async saveFolders(folders: LaunchmatFolder[]): Promise<void> {
    try {
      await LocalStorage.setItem(this.STORAGE_KEY_FOLDERS, JSON.stringify(folders));
    } catch (error) {
      console.error("Error saving folders:", error);
      throw error;
    }
  }

  async loadSettings(): Promise<LaunchmatSettings> {
    try {
      const settingsData = await LocalStorage.getItem<string>(this.STORAGE_KEY_SETTINGS);
      if (!settingsData) {
        return this.createDefaultSettings();
      }
      return JSON.parse(settingsData);
    } catch (error) {
      console.error("Error loading settings:", error);
      return this.createDefaultSettings();
    }
  }

  async saveSettings(settings: LaunchmatSettings): Promise<void> {
    try {
      await LocalStorage.setItem(this.STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error("Error saving settings:", error);
      throw error;
    }
  }

  async loadApplicationMappings(): Promise<Record<string, string>> {
    try {
      const mappingsData = await LocalStorage.getItem<string>(this.STORAGE_KEY_APP_MAPPINGS);
      return mappingsData ? JSON.parse(mappingsData) : {};
    } catch (error) {
      console.error("Error loading app mappings:", error);
      return {};
    }
  }

  async saveApplicationMappings(mappings: Record<string, string>): Promise<void> {
    try {
      await LocalStorage.setItem(this.STORAGE_KEY_APP_MAPPINGS, JSON.stringify(mappings));
    } catch (error) {
      console.error("Error saving app mappings:", error);
      throw error;
    }
  }

  async getLastScanTime(): Promise<string | null> {
    try {
      return await LocalStorage.getItem<string>(this.STORAGE_KEY_LAST_SCAN) || null;
    } catch (error) {
      return null;
    }
  }

  async setLastScanTime(time: string): Promise<void> {
    try {
      await LocalStorage.setItem(this.STORAGE_KEY_LAST_SCAN, time);
    } catch (error) {
      console.error("Error saving last scan time:", error);
    }
  }

  private createDefaultFolders(): LaunchmatFolder[] {
    const defaultColors = [
      "#FF6B6B", // Red
      "#4ECDC4", // Teal
      "#45B7D1", // Blue
      "#96CEB4", // Green
      "#FECA57", // Yellow
      "#FF9FF3", // Pink
      "#54A0FF", // Light Blue
      "#5F27CD", // Purple
    ];

    return [
      {
        id: "folder_productivity",
        name: "Productivity",
        color: defaultColors[0],
        icon: "briefcase",
        applicationIds: [],
        position: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: "folder_development",
        name: "Development",
        color: defaultColors[1],
        icon: "code",
        applicationIds: [],
        position: 1,
        createdAt: new Date().toISOString(),
      },
      {
        id: "folder_graphics",
        name: "Graphics & Design",
        color: defaultColors[2],
        icon: "paintbrush",
        applicationIds: [],
        position: 2,
        createdAt: new Date().toISOString(),
      },
      {
        id: "folder_entertainment",
        name: "Entertainment",
        color: defaultColors[3],
        icon: "play",
        applicationIds: [],
        position: 3,
        createdAt: new Date().toISOString(),
      },
      {
        id: "folder_utilities",
        name: "Utilities",
        color: defaultColors[4],
        icon: "wrench",
        applicationIds: [],
        position: 4,
        createdAt: new Date().toISOString(),
      },
      {
        id: "folder_games",
        name: "Games",
        color: defaultColors[5],
        icon: "gamepad",
        applicationIds: [],
        position: 5,
        createdAt: new Date().toISOString(),
      },
      {
        id: "folder_communication",
        name: "Communication",
        color: defaultColors[6],
        icon: "message-circle",
        applicationIds: [],
        position: 6,
        createdAt: new Date().toISOString(),
      },
      {
        id: "folder_other",
        name: "Other",
        color: defaultColors[7],
        icon: "grid",
        applicationIds: [],
        position: 7,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  private createDefaultSettings(): LaunchmatSettings {
    return {
      folders: [],
      applicationMappings: {},
      lastScanTime: new Date().toISOString(),
      version: "1.0.0",
    };
  }

  async autoCategorizeNewApps(
    applications: Application[],
    existingFolders: LaunchmatFolder[]
  ): Promise<LaunchmatFolder[]> {
    try {
      const mappings = await this.loadApplicationMappings();
      const folders = [...existingFolders];
      const updatedMappings = { ...mappings };
      
      // Find uncategorized applications
      const categorizedAppIds = new Set(Object.keys(mappings));
      const uncategorizedApps = applications.filter(app => !categorizedAppIds.has(app.id));
      
      for (const app of uncategorizedApps) {
        const targetFolderId = this.getCategoryForApp(app, folders);
        const targetFolder = folders.find(f => f.id === targetFolderId);
        
        if (targetFolder && !targetFolder.applicationIds.includes(app.id)) {
          targetFolder.applicationIds.push(app.id);
          updatedMappings[app.id] = targetFolderId;
        }
      }
      
      // Save updated mappings
      await this.saveApplicationMappings(updatedMappings);
      await this.saveFolders(folders);
      
      return folders;
    } catch (error) {
      console.error("Error auto-categorizing apps:", error);
      return existingFolders;
    }
  }

  private getCategoryForApp(app: Application, folders: LaunchmatFolder[]): string {
    const category = app.category?.toLowerCase() || "other";
    
    // Map application categories to folder IDs
    const categoryMapping: Record<string, string> = {
      "productivity": "folder_productivity",
      "development": "folder_development", 
      "graphics": "folder_graphics",
      "entertainment": "folder_entertainment",
      "utilities": "folder_utilities",
      "games": "folder_games",
      "communication": "folder_communication",
      "finance": "folder_utilities",
      "social": "folder_communication",
      "other": "folder_other",
    };
    
    const targetFolderId = categoryMapping[category] || "folder_other";
    
    // Verify the folder exists
    const targetFolder = folders.find(f => f.id === targetFolderId);
    return targetFolder ? targetFolderId : "folder_other";
  }

  async moveAppToFolder(
    appId: string, 
    fromFolderId: string | null, 
    toFolderId: string
  ): Promise<void> {
    try {
      const folders = await this.loadFolders();
      const mappings = await this.loadApplicationMappings();
      
      // Remove from previous folder
      if (fromFolderId) {
        const fromFolder = folders.find(f => f.id === fromFolderId);
        if (fromFolder) {
          fromFolder.applicationIds = fromFolder.applicationIds.filter(id => id !== appId);
        }
      }
      
      // Add to new folder
      const toFolder = folders.find(f => f.id === toFolderId);
      if (toFolder && !toFolder.applicationIds.includes(appId)) {
        toFolder.applicationIds.push(appId);
      }
      
      // Update mappings
      mappings[appId] = toFolderId;
      
      await this.saveFolders(folders);
      await this.saveApplicationMappings(mappings);
    } catch (error) {
      console.error("Error moving app to folder:", error);
      throw error;
    }
  }

  async createFolder(name: string, color: string, icon: string): Promise<LaunchmatFolder> {
    try {
      const folders = await this.loadFolders();
      const newFolder: LaunchmatFolder = {
        id: `folder_${Date.now()}`,
        name,
        color,
        icon,
        applicationIds: [],
        position: folders.length,
        createdAt: new Date().toISOString(),
      };
      
      folders.push(newFolder);
      await this.saveFolders(folders);
      
      return newFolder;
    } catch (error) {
      console.error("Error creating folder:", error);
      throw error;
    }
  }

  async deleteFolder(folderId: string): Promise<void> {
    try {
      const folders = await this.loadFolders();
      const mappings = await this.loadApplicationMappings();
      
      const folderIndex = folders.findIndex(f => f.id === folderId);
      if (folderIndex === -1) return;
      
      const folder = folders[folderIndex];
      
      // Move all apps to "Other" folder
      const otherFolder = folders.find(f => f.id === "folder_other");
      if (otherFolder) {
        for (const appId of folder.applicationIds) {
          if (!otherFolder.applicationIds.includes(appId)) {
            otherFolder.applicationIds.push(appId);
          }
          mappings[appId] = "folder_other";
        }
      }
      
      // Remove folder
      folders.splice(folderIndex, 1);
      
      await this.saveFolders(folders);
      await this.saveApplicationMappings(mappings);
    } catch (error) {
      console.error("Error deleting folder:", error);
      throw error;
    }
  }

  async updateFolder(
    folderId: string, 
    updates: Partial<Pick<LaunchmatFolder, 'name' | 'color' | 'icon'>>
  ): Promise<void> {
    try {
      const folders = await this.loadFolders();
      const folder = folders.find(f => f.id === folderId);
      
      if (folder) {
        Object.assign(folder, updates, { updatedAt: new Date().toISOString() });
        await this.saveFolders(folders);
      }
    } catch (error) {
      console.error("Error updating folder:", error);
      throw error;
    }
  }

  async reorderFolders(folderIds: string[]): Promise<void> {
    try {
      const folders = await this.loadFolders();
      
      // Update positions based on new order
      folderIds.forEach((folderId, index) => {
        const folder = folders.find(f => f.id === folderId);
        if (folder) {
          folder.position = index;
        }
      });
      
      // Sort folders by position
      folders.sort((a, b) => a.position - b.position);
      
      await this.saveFolders(folders);
    } catch (error) {
      console.error("Error reordering folders:", error);
      throw error;
    }
  }

  async exportSettings(): Promise<string> {
    try {
      const folders = await this.loadFolders();
      const settings = await this.loadSettings();
      const mappings = await this.loadApplicationMappings();
      
      const exportData = {
        folders,
        settings,
        mappings,
        exportedAt: new Date().toISOString(),
        version: "1.0.0",
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error("Error exporting settings:", error);
      throw error;
    }
  }

  async importSettings(data: string): Promise<void> {
    try {
      const importData = JSON.parse(data);
      
      if (importData.folders) {
        await this.saveFolders(importData.folders);
      }
      
      if (importData.settings) {
        await this.saveSettings(importData.settings);
      }
      
      if (importData.mappings) {
        await this.saveApplicationMappings(importData.mappings);
      }
    } catch (error) {
      console.error("Error importing settings:", error);
      throw error;
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await LocalStorage.removeItem(this.STORAGE_KEY_FOLDERS);
      await LocalStorage.removeItem(this.STORAGE_KEY_SETTINGS);
      await LocalStorage.removeItem(this.STORAGE_KEY_APP_MAPPINGS);
      await LocalStorage.removeItem(this.STORAGE_KEY_LAST_SCAN);
    } catch (error) {
      console.error("Error clearing data:", error);
      throw error;
    }
  }
}