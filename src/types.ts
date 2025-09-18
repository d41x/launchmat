export interface Application {
  id: string;
  name: string;
  bundleIdentifier: string;
  path: string;
  version?: string;
  icon?: string;
  category?: string;
  lastModified: string;
  size?: number;
}

export interface LaunchmatFolder {
  id: string;
  name: string;
  color: string;
  icon: string;
  applicationIds: string[];
  position: number;
  createdAt: string;
  updatedAt?: string;
}

export interface LaunchmatPreferences {
  columns: number;
  itemsPerPage: string;
  enableLiquidGlass: boolean;
  defaultFolderColor: string;
  autoOrganize: boolean;
  showAppVersion: boolean;
  enableGestures: boolean;
}

export interface LaunchmatSettings {
  folders: LaunchmatFolder[];
  applicationMappings: Record<string, string>; // app id -> folder id
  lastScanTime: string;
  version: string;
}

export interface ApplicationScanResult {
  applications: Application[];
  newApplications: Application[];
  removedApplications: string[];
}