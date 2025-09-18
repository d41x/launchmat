import React, { useState, useMemo } from "react";
import {
  Grid,
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { LaunchmatFolder, Application } from "../types";
import { AppIcon } from "./AppIcon";

interface FolderViewProps {
  folder: LaunchmatFolder;
  applications: Application[];
  onLaunchApp: (app: Application) => Promise<void>;
  onBack: () => void;
  currentPage: number;
  itemsPerPage: number;
}

export function FolderView({
  folder,
  applications,
  onLaunchApp,
  onBack,
  currentPage,
  itemsPerPage,
}: FolderViewProps): JSX.Element {
  const [searchText, setSearchText] = useState("");

  const folderApps = useMemo(() => {
    return applications
      .filter(app => folder.applicationIds.includes(app.id))
      .filter(app => 
        searchText ? app.name.toLowerCase().includes(searchText.toLowerCase()) : true
      );
  }, [applications, folder.applicationIds, searchText]);

  const totalPages = Math.ceil(folderApps.length / itemsPerPage);
  const currentPageApps = folderApps.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const handleLaunchApp = async (app: Application) => {
    try {
      await onLaunchApp(app);
    } catch (error) {
      showToast(Toast.Style.Failure, `Failed to launch ${app.name}`);
    }
  };

  const handleRemoveFromFolder = async (app: Application) => {
    const confirmed = await confirmAlert({
      title: "Remove Application",
      message: `Remove "${app.name}" from "${folder.name}" folder?`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      // TODO: Implement remove from folder functionality
      showToast(Toast.Style.Success, `Removed ${app.name} from folder`);
    }
  };

  return (
    <Grid
      columns={6}
      searchBarPlaceholder={`Search in ${folder.name}...`}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle={folder.name}
      actions={
        <ActionPanel>
          <Action
            title="Back to Folders"
            icon={Icon.ArrowLeft}
            onAction={onBack}
            shortcut={Keyboard.Shortcut.Common.Back}
          />
          <ActionPanel.Section>
            <Action
              title="Edit Folder"
              icon={Icon.Pencil}
              onAction={() => {
                // TODO: Implement folder editing
                showToast(Toast.Style.Success, "Folder editing coming soon");
              }}
              shortcut={Keyboard.Shortcut.Common.Edit}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {currentPageApps.map((app) => (
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
                onAction={() => handleLaunchApp(app)}
              />
              <ActionPanel.Section>
                <Action
                  title="Back to Folders"
                  icon={Icon.ArrowLeft}
                  onAction={onBack}
                  shortcut={Keyboard.Shortcut.Common.Back}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Remove from Folder"
                  icon={Icon.Minus}
                  style={Action.Style.Destructive}
                  onAction={() => handleRemoveFromFolder(app)}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                />
                <Action
                  title="Show in Finder"
                  icon={Icon.Finder}
                  onAction={() => {
                    // TODO: Implement show in finder
                  }}
                />
                <Action
                  title="Get Info"
                  icon={Icon.Info}
                  onAction={() => {
                    // TODO: Implement get info
                  }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}

      {folderApps.length === 0 && (
        <Grid.Item
          key="empty"
          title="No Applications"
          subtitle="This folder is empty"
          content={{ source: Icon.Folder, tintColor: folder.color }}
        />
      )}

      {totalPages > 1 && (
        <Grid.Item
          key="page_indicator"
          title={`Page ${currentPage + 1} of ${totalPages}`}
          subtitle="Use arrow keys to navigate"
          content={{ source: Icon.Dot, tintColor: folder.color }}
        />
      )}
    </Grid>
  );
}
