import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Action,
  ActionPanel,
  Grid,
  Icon,
  getPreferenceValues,
  showToast,
  Toast,
  LocalStorage,
  openCommandPreferences,
  Keyboard,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { ApplicationScanner } from "./utils/applicationScanner";
import { StorageManager } from "./utils/storageManager";
import { LaunchmatFolder, Application, LaunchmatPreferences } from "./types";
import { AppIcon } from "./components/AppIcon";
import { FolderView } from "./components/FolderView";

interface LaunchmatState {
  applications: Application[];
  folders: LaunchmatFolder[];
  currentFolder: string | null;
  currentPage: number;
  searchText: string;
  isLoading: boolean;
}

export default function Launchmat() {
  const preferences = getPreferenceValues<LaunchmatPreferences>();
  const [state, setState] = useState<LaunchmatState>({
    applications: [],
    folders: [],
    currentFolder: null,
    currentPage: 0,
    searchText: "",
    isLoading: true,
  });

  const storageManager = useMemo(() => new StorageManager(), []);
  const applicationScanner = useMemo(() => new ApplicationScanner(), []);

  // Initialization
  const initializeLaunchmat = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Load existing folders and settings
      const existingFolders = await storageManager.loadFolders();
      const applications = await applicationScanner.scanApplications();
      
      // Auto-categorize new applications
      const updatedFolders = await storageManager.autoCategorizeNewApps(
        applications,
        existingFolders
      );
      
      setState(prev => ({
        ...prev,
        applications,
        folders: updatedFolders,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Failed to initialize Launchmat:", error);
      showToast(Toast.Style.Failure, "Failed to load applications");
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [storageManager, applicationScanner]);

  useEffect(() => {
    initializeLaunchmat();
  }, [initializeLaunchmat]);

  // Search functionality
  const filteredContent = useMemo(() => {
    if (state.currentFolder) {
      const folder = state.folders.find(f => f.id === state.currentFolder);
      if (!folder) return [];
      
      const folderApps = state.applications.filter(app => 
        folder.applicationIds.includes(app.id)
      );
      
      if (!state.searchText) return folderApps;
      return folderApps.filter(app => 
        app.name.toLowerCase().includes(state.searchText.toLowerCase())
      );
    }
    
    // Show folders on main view
    if (!state.searchText) return state.folders;
    
    // Search across all applications when searching
    return state.applications.filter(app => 
      app.name.toLowerCase().includes(state.searchText.toLowerCase())
    );
  }, [state]);

  // Page navigation (for Launchpad-like pagination)
  const itemsPerPage = parseInt(preferences.itemsPerPage) || 28;
  const totalPages = Math.ceil(filteredContent.length / itemsPerPage);
  const currentPageItems = filteredContent.slice(
    state.currentPage * itemsPerPage,
    (state.currentPage + 1) * itemsPerPage
  );

  // Navigation handlers
  const nextPage = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentPage: prev.currentPage < totalPages - 1 ? prev.currentPage + 1 : 0
    }));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentPage: prev.currentPage > 0 ? prev.currentPage - 1 : totalPages - 1
    }));
  }, [totalPages]);

  // Folder navigation
  const openFolder = useCallback((folderId: string) => {
    setState(prev => ({ 
      ...prev, 
      currentFolder: folderId,
      currentPage: 0,
      searchText: ""
    }));
  }, []);

  const goBack = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      currentFolder: null,
      currentPage: 0,
      searchText: ""
    }));
  }, []);

  // Application actions
  const launchApplication = useCallback(async (app: Application) => {
    try {
      await applicationScanner.launchApplication(app);
      showToast(Toast.Style.Success, `Launched ${app.name}`);
    } catch (error) {
      showToast(Toast.Style.Failure, `Failed to launch ${app.name}`);
    }
  }, [applicationScanner]);

  const createNewFolder = useCallback(async () => {
    const newFolder: LaunchmatFolder = {
      id: `folder_${Date.now()}`,
      name: "New Folder",
      color: "#007AFF",
      icon: "folder",
      applicationIds: [],
      position: state.folders.length,
      createdAt: new Date().toISOString(),
    };
    
    const updatedFolders = [...state.folders, newFolder];
    await storageManager.saveFolders(updatedFolders);
    setState(prev => ({ ...prev, folders: updatedFolders }));
    showToast(Toast.Style.Success, "New folder created");
  }, [state.folders, storageManager]);

  // Render content based on current view
  const renderContent = () => {
    if (state.currentFolder) {
      return (
        <FolderView
          folder={state.folders.find(f => f.id === state.currentFolder)!}
          applications={state.applications}
          onLaunchApp={launchApplication}
          onBack={goBack}
          currentPage={state.currentPage}
          itemsPerPage={itemsPerPage}
        />
      );
    }

    // Main grid view showing folders or search results
    return (
      <Grid
        columns={preferences.columns || 6}
        searchBarPlaceholder="Search applications and folders..."
        isLoading={state.isLoading}
        searchText={state.searchText}
        onSearchTextChange={(text) => 
          setState(prev => ({ ...prev, searchText: text, currentPage: 0 }))
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title="Create New Folder"
                icon={Icon.NewFolder}
                onAction={createNewFolder}
                shortcut={Keyboard.Shortcut.Common.New}
              />
              <Action
                title="Settings"
                icon={Icon.Gear}
                onAction={openCommandPreferences}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
            </ActionPanel.Section>
            {totalPages > 1 && (
              <ActionPanel.Section title="Navigation">
                <Action
                  title="Next Page"
                  icon={Icon.ArrowRight}
                  onAction={nextPage}
                  shortcut={{ modifiers: [], key: "arrowRight" }}
                />
                <Action
                  title="Previous Page"
                  icon={Icon.ArrowLeft}
                  onAction={prevPage}
                  shortcut={{ modifiers: [], key: "arrowLeft" }}
                />
              </ActionPanel.Section>
            )}
            <Action
              title="Refresh Applications"
              icon={Icon.RotateClockwise}
              onAction={initializeLaunchmat}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            />
          </ActionPanel>
        }
      >
        {currentPageItems.map((item) => {
          if ('applicationIds' in item) {
            // This is a folder
            const folder = item as LaunchmatFolder;
            const appCount = folder.applicationIds.length;
            
            return (
              <Grid.Item
                key={folder.id}
                id={folder.id}
                title={folder.name}
                subtitle={`${appCount} app${appCount !== 1 ? 's' : ''}`}
                content={{
                  color: folder.color,
                  source: folder.icon === 'folder' ? Icon.Folder : folder.icon as any,
                }}
                actions={
                  <ActionPanel>
                    <Action
                      title="Open Folder"
                      icon={Icon.ArrowRight}
                      onAction={() => openFolder(folder.id)}
                    />
                    <ActionPanel.Section>
                      <Action
                        title="Create New Folder"
                        icon={Icon.NewFolder}
                        onAction={createNewFolder}
                        shortcut={Keyboard.Shortcut.Common.New}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          } else {
            // This is an application (shown in search results)
            const app = item as Application;
            return (
              <Grid.Item
                key={app.id}
                id={app.id}
                title={app.name}
                subtitle={app.version || ""}
                content={<AppIcon app={app} />}
                actions={
                  <ActionPanel>
                    <Action
                      title="Launch Application"
                      icon={Icon.Play}
                      onAction={() => launchApplication(app)}
                    />
                    <ActionPanel.Section>
                      <Action
                        title="Show in Finder"
                        icon={Icon.Finder}
                        onAction={() => applicationScanner.showInFinder(app)}
                      />
                      <Action
                        title="Get Info"
                        icon={Icon.Info}
                        onAction={() => applicationScanner.getApplicationInfo(app)}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          }
        })}
        
        {totalPages > 1 && (
          <Grid.Item
            key="page_indicator"
            title={`Page ${state.currentPage + 1} of ${totalPages}`}
            subtitle="Use arrow keys to navigate"
            content={{ source: Icon.Dot, tintColor: "#007AFF" }}
          />
        )}
      </Grid>
    );
  };

  return renderContent();
}