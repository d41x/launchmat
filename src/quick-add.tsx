import { useState, useEffect, useCallback, useMemo } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Keyboard,
  Color,
} from "@raycast/api";
import { ApplicationScanner } from "./utils/applicationScanner";
import { StorageManager } from "./utils/storageManager";
import { Application, LaunchmatFolder } from "./types";

interface QuickAddState {
  applications: Application[];
  folders: LaunchmatFolder[];
  mappings: Record<string, string>;
  isLoading: boolean;
}

export default function QuickAdd() {
  const [state, setState] = useState<QuickAddState>({
    applications: [],
    folders: [],
    mappings: {},
    isLoading: true,
  });

  const storageManager = useMemo(() => new StorageManager(), []);
  const applicationScanner = useMemo(() => new ApplicationScanner(), []);

  const loadData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const [applications, folders, mappings] = await Promise.all([
        applicationScanner.scanApplications(),
        storageManager.loadFolders(),
        storageManager.loadApplicationMappings(),
      ]);

      setState({
        applications: applications.sort((a, b) => a.name.localeCompare(b.name)),
        folders: folders.sort((a, b) => a.position - b.position),
        mappings,
        isLoading: false,
      });
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to load data");
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [storageManager, applicationScanner]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter applications to show uncategorized ones first, then all apps
  const categorizedApps = useMemo(() => {
    const uncategorized: Application[] = [];
    const categorized: Application[] = [];

    state.applications.forEach(app => {
      if (state.mappings[app.id]) {
        categorized.push(app);
      } else {
        uncategorized.push(app);
      }
    });

    return { uncategorized, categorized };
  }, [state.applications, state.mappings]);

  const moveAppToFolder = useCallback(async (app: Application, targetFolderId: string) => {
    try {
      const currentFolderId = state.mappings[app.id];
      await storageManager.moveAppToFolder(app.id, currentFolderId, targetFolderId);
      
      // Update local state
      setState(prev => ({
        ...prev,
        mappings: { ...prev.mappings, [app.id]: targetFolderId },
        folders: prev.folders.map(folder => {
          if (folder.id === targetFolderId && !folder.applicationIds.includes(app.id)) {
            return { ...folder, applicationIds: [...folder.applicationIds, app.id] };
          }
          if (folder.id === currentFolderId) {
            return { ...folder, applicationIds: folder.applicationIds.filter(id => id !== app.id) };
          }
          return folder;
        }),
      }));

      const targetFolder = state.folders.find(f => f.id === targetFolderId);
      showToast(Toast.Style.Success, `Added ${app.name} to ${targetFolder?.name}`);
    } catch (error) {
      showToast(Toast.Style.Failure, `Failed to move ${app.name}`);
    }
  }, [state.mappings, state.folders, storageManager]);

  const removeAppFromFolder = useCallback(async (app: Application) => {
    try {
      const currentFolderId = state.mappings[app.id];
      if (!currentFolderId) return;

      await storageManager.moveAppToFolder(app.id, currentFolderId, "folder_other");
      
      // Update local state
      setState(prev => ({
        ...prev,
        mappings: { ...prev.mappings, [app.id]: "folder_other" },
        folders: prev.folders.map(folder => {
          if (folder.id === "folder_other" && !folder.applicationIds.includes(app.id)) {
            return { ...folder, applicationIds: [...folder.applicationIds, app.id] };
          }
          if (folder.id === currentFolderId) {
            return { ...folder, applicationIds: folder.applicationIds.filter(id => id !== app.id) };
          }
          return folder;
        }),
      }));

      showToast(Toast.Style.Success, `Removed ${app.name} from folder`);
    } catch (error) {
      showToast(Toast.Style.Failure, `Failed to remove ${app.name}`);
    }
  }, [state.mappings, storageManager]);

  const getAppCurrentFolder = useCallback((app: Application): LaunchmatFolder | null => {
    const folderId = state.mappings[app.id];
    return folderId ? state.folders.find(f => f.id === folderId) || null : null;
  }, [state.mappings, state.folders]);

  const createFolderActions = useCallback((app: Application) => {
    const currentFolder = getAppCurrentFolder(app);
    
    return state.folders.map(folder => (
      <Action
        key={folder.id}
        title={folder.name}
        icon={{ source: Icon.Folder, tintColor: folder.color }}
        onAction={() => moveAppToFolder(app, folder.id)}
      />
    ));
  }, [state.folders, getAppCurrentFolder, moveAppToFolder]);

  return (
    <List 
      isLoading={state.isLoading} 
      searchBarPlaceholder="Search applications to organize..."
    >
      {categorizedApps.uncategorized.length > 0 && (
        <List.Section title={`Uncategorized Apps (${categorizedApps.uncategorized.length})`}>
          {categorizedApps.uncategorized.map(app => {
            const currentFolder = getAppCurrentFolder(app);
            
            return (
              <List.Item
                key={app.id}
                icon={app.icon ? { fileIcon: app.icon } : Icon.Desktop}
                title={app.name}
                subtitle={app.version || ""}
                accessories={[
                  { text: "Not categorized", icon: Icon.QuestionMark }
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Add to Folder">
                      {createFolderActions(app)}
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action
                        title="Launch Application"
                        icon={Icon.Play}
                        onAction={() => applicationScanner.launchApplication(app)}
                      />
                      <Action
                        title="Show in Finder"
                        icon={Icon.Finder}
                        onAction={() => applicationScanner.showInFinder(app)}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      <List.Section title={`All Applications (${categorizedApps.categorized.length})`}>
        {categorizedApps.categorized.map(app => {
          const currentFolder = getAppCurrentFolder(app);
          
          return (
            <List.Item
              key={app.id}
              icon={app.icon ? { fileIcon: app.icon } : Icon.Desktop}
              title={app.name}
              subtitle={app.version || ""}
              accessories={[
                currentFolder 
                  ? { 
                      text: currentFolder.name, 
                      icon: { source: Icon.Folder, tintColor: currentFolder.color }
                    }
                  : { text: "No folder", icon: Icon.QuestionMark }
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Move to Folder">
                    {createFolderActions(app)}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    {currentFolder && (
                      <Action
                        title="Remove from Folder"
                        icon={Icon.Minus}
                        style={Action.Style.Destructive}
                        onAction={() => removeAppFromFolder(app)}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Launch Application"
                      icon={Icon.Play}
                      onAction={() => applicationScanner.launchApplication(app)}
                    />
                    <Action
                      title="Show in Finder"
                      icon={Icon.Finder}
                      onAction={() => applicationScanner.showInFinder(app)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="Folders Overview">
        {state.folders.map(folder => (
          <List.Item
            key={`folder-${folder.id}`}
            icon={{ source: Icon.Folder, tintColor: folder.color }}
            title={folder.name}
            subtitle={`${folder.applicationIds.length} apps`}
            accessories={[
              { text: `Position ${folder.position + 1}` }
            ]}
          />
        ))}
      </List.Section>
    </List>
  );
}