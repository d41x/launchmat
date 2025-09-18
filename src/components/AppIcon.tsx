import React from "react";
import { Icon } from "@raycast/api";
import { Application } from "../types";

interface AppIconProps {
  app: Application;
  size?: "small" | "medium" | "large";
}

export function AppIcon({ app, size = "medium" }: AppIconProps): JSX.Element {
  // If we have a custom icon path, use it
  if (app.icon && app.icon.endsWith('.icns')) {
    return (
      <img 
        src={`file://${app.icon}`} 
        alt={app.name}
        style={{
          width: size === "small" ? "32px" : size === "medium" ? "64px" : "128px",
          height: size === "small" ? "32px" : size === "medium" ? "64px" : "128px",
          borderRadius: size === "small" ? "4px" : "8px",
          objectFit: "contain",
        }}
        onError={(e) => {
          // Fallback to default icon if image fails to load
          e.currentTarget.style.display = "none";
          e.currentTarget.nextElementSibling?.setAttribute("style", "display: block");
        }}
      />
    );
  }

  // Fallback icon based on category or app name
  const getDefaultIcon = (): Icon => {
    const category = app.category?.toLowerCase();
    const appName = app.name.toLowerCase();

    if (category === "development" || appName.includes("code") || appName.includes("terminal")) {
      return Icon.Code;
    }
    if (category === "graphics" || appName.includes("photo") || appName.includes("design")) {
      return Icon.Image;
    }
    if (category === "entertainment" || appName.includes("music") || appName.includes("video")) {
      return Icon.Play;
    }
    if (category === "communication" || appName.includes("mail") || appName.includes("message")) {
      return Icon.Message;
    }
    if (category === "utilities" || appName.includes("utility")) {
      return Icon.Gear;
    }
    if (category === "games" || appName.includes("game")) {
      return Icon.GameController;
    }
    if (category === "productivity" || appName.includes("office")) {
      return Icon.Document;
    }
    
    return Icon.Desktop;
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size === "small" ? "32px" : size === "medium" ? "64px" : "128px",
        height: size === "small" ? "32px" : size === "medium" ? "64px" : "128px",
        borderRadius: size === "small" ? "4px" : "8px",
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
      }}
    >
      <Icon 
        source={getDefaultIcon()}
        tintColor="#FFFFFF"
      />
    </div>
  );
}
