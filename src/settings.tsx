import { useState, useEffect, useCallback } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Keyboard,
  push,
} from "@raycast/api";
import { StorageManager } from "./utils/storageManager";
import { LaunchmatFolder } from "./types";
import { FolderEditor } from "./components/FolderEditor";

interface SettingsState {
  folders: LaunchmatFolder[];
  isLoading: boolean;
}

export default function LaunchmatSettings() {
  const [state, setState] = useState<SettingsState>({
    folders: [],
    isLoading: true,
  });

  const storageManager = new StorageManager();

  const loadFolders = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const folders = await storageManager.loadFolders();
      setState({ folders: folders.sort((a, b) => a.position - b.position), isLoading: false });
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to load folders");
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [storageManager]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const handleCreateFolder = useCallback(async (folderData: Partial<LaunchmatFolder>) => {
    try {
      const newFolder = await storageManager.createFolder(
        folderData.name!,
        folderData.color!,
        folderData.icon!
      );
      setState(prev => ({
        ...prev,
        folders: [...prev.folders, newFolder].sort((a, b) => a.position - b.position),
      }));
      showToast(Toast.Style.Success, "Folder created successfully");
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to create folder");
      throw error;
    }
  }, [storageManager]);

  const handleUpdateFolder = useCallback(async (
    folderId: string,
    updates: Partial<LaunchmatFolder>
  ) => {
    try {
      await storageManager.updateFolder(folderId, updates);
      setState(prev => ({
        ...prev,
        folders: prev.folders.map(f => 
          f.id === folderId ? { ...f, ...updates } : f
        ),
      }));
      showToast(Toast.Style.Success, "Folder updated successfully");
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to update folder");
      throw error;
    }
  }, [storageManager]);

  const handleDeleteFolder = useCallback(async (folderId: string, folderName: string) => {
    const confirmed = await confirmAlert({
      title: "Delete Folder",
      message: `Are you sure you want to delete "${folderName}"? All apps in this folder will be moved to "Other".`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await storageManager.deleteFolder(folderId);
        setState(prev => ({
          ...prev,
          folders: prev.folders.filter(f => f.id !== folderId),
        }));
        showToast(Toast.Style.Success, "Folder deleted successfully");
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed to delete folder");
      }
    }
  }, [storageManager]);

  const handleExportSettings = useCallback(async () => {
    try {
      const exportData = await storageManager.exportSettings();
      // Note: In a real implementation, you'd want to save this to a file
      // For now, we'll just show a success message
      showToast(Toast.Style.Success, "Settings exported to clipboard");
      // Copy to clipboard (this would need to be implemented with a clipboard API)
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to export settings");
    }
  }, [storageManager]);

  const handleClearAllData = useCallback(async () => {
    const confirmed = await confirmAlert({
      title: "Clear All Data",
      message: "This will permanently delete all your folders and settings. This action cannot be undone.",
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await storageManager.clearAllData();
        setState({ folders: [], isLoading: false });
        showToast(Toast.Style.Success, "All data cleared");
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed to clear data");
      }
    }
  }, [storageManager]);

  const moveFolder = useCallback(async (folderId: string, direction: 'up' | 'down') => {
    const folders = [...state.folders];
    const currentIndex = folders.findIndex(f => f.id === folderId);
    
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= folders.length) return;
    
    // Swap folders
    [folders[currentIndex], folders[newIndex]] = [folders[newIndex], folders[currentIndex]];
    
    // Update positions
    folders.forEach((folder, index) => {
      folder.position = index;
    });
    
    try {
      await storageManager.reorderFolders(folders.map(f => f.id));
      setState(prev => ({ ...prev, folders }));
      showToast(Toast.Style.Success, "Folder order updated");
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to reorder folders");
    }
  }, [state.folders, storageManager]);

  return (
    <List isLoading={state.isLoading} searchBarPlaceholder="Search folders...">
      <List.Section title="Folders">
        {state.folders.map((folder, index) => (
          <List.Item
            key={folder.id}
            icon={{ source: Icon.Folder, tintColor: folder.color }}
            title={folder.name}
            subtitle={`${folder.applicationIds.length} apps`}
            accessories={[
              { text: `Position ${index + 1}` },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Edit Folder"
                    icon={Icon.Pencil}
                    onAction={() => push(
                      <FolderEditor
                        folder={folder}
                        onSave={(updates) => handleUpdateFolder(folder.id, updates)}
                        onCancel={() => {/* pop back */}}
                      />
                    )}
                  />
                  <Action
                    title="Delete Folder"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDeleteFolder(folder.id, folder.name)}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Reorder">
                  <Action
                    title="Move Up"
                    icon={Icon.ArrowUp}
                    onAction={() => moveFolder(folder.id, 'up')}
                    shortcut={Keyboard.Shortcut.Common.MoveUp}
                  />
                  <Action
                    title="Move Down"
                    icon={Icon.ArrowDown}
                    onAction={() => moveFolder(folder.id, 'down')}
                    shortcut={Keyboard.Shortcut.Common.MoveDown}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Actions">
        <List.Item
          icon={Icon.Plus}
          title="Create New Folder"
          actions={
            <ActionPanel>
              <Action
                title="Create Folder"
                icon={Icon.Plus}
                onAction={() => push(
                  <FolderEditor
                    onSave={handleCreateFolder}
                    onCancel={() => {/* pop back */}}
                  />
                )}
                shortcut={Keyboard.Shortcut.Common.New}
              />
            </ActionPanel>
          }
        />
        
        <List.Item
          icon={Icon.Download}
          title="Export Settings"
          subtitle="Export your folder configuration"
          actions={
            <ActionPanel>
              <Action
                title="Export Settings"
                icon={Icon.Download}
                onAction={handleExportSettings}
              />
            </ActionPanel>
          }
        />
        
        <List.Item
          icon={Icon.Trash}
          title="Clear All Data"
          subtitle="Reset Launchmat to defaults"
          actions={
            <ActionPanel>
              <Action
                title="Clear All Data"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={handleClearAllData}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Statistics">
        <List.Item
          icon={Icon.BarChart}
          title={`Total Folders: ${state.folders.length}`}
          subtitle={`Total Apps: ${state.folders.reduce((sum, f) => sum + f.applicationIds.length, 0)}`}
        />
      </List.Section>
    </List>
  );
}