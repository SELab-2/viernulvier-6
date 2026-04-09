import type { ComponentType, ReactNode } from "react";

export enum ActionDisplay {
    Inline = "inline",
    Menu = "menu",
}

export enum ActionVariant {
    Default = "default",
    Destructive = "destructive",
}

/**
 * Discriminated union for row-level actions.
 *
 * - **Simple action**: has `label` + `onClick`. Rendered as a `DropdownMenuItem`
 *   (default) or an icon button when `display: ActionDisplay.Inline`.
 * - **Custom render action**: has `render`. The render function replaces the
 *   `DropdownMenuItem` entirely, useful for complex UI like submenus.
 *   Always rendered inside the dropdown menu.
 */
export type Action<T> =
    | {
          key: string;
          label: string;
          icon: ComponentType<{ className?: string }>;
          onClick: (entity: T) => void | Promise<void>;
          variant?: ActionVariant;
          /** Inline actions render as icon-only buttons and require an icon. */
          display: ActionDisplay.Inline;
      }
    | {
          key: string;
          label: string;
          icon?: ComponentType<{ className?: string }>;
          onClick: (entity: T) => void | Promise<void>;
          variant?: ActionVariant;
          /** Where to display the action. Defaults to `ActionDisplay.Menu`. */
          display?: ActionDisplay.Menu;
      }
    | {
          key: string;
          /** Custom render function for complex actions (e.g. submenus). */
          render: (entity: T, closeMenu: () => void) => ReactNode;
      };

export interface BulkAction {
    key: string;
    label: string;
    icon?: ReactNode;
    onClick?: () => void;
    variant?: ActionVariant;
    disabled?: boolean;
}
