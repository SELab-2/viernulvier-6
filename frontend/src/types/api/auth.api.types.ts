import { components } from "@/types/api/generated";
import { UserRole } from "@/types/models/user.types";

export type UserResponse = components["schemas"]["EditorResponse"];
export type AuthResponse = components["schemas"]["AuthResponse"];
export type LoginRequest = components["schemas"]["LoginRequest"];

export type CreateEditorRequest = components["schemas"]["CreateEditorRequest"];
export type CreatedEditorResponse = components["schemas"]["EditorResponse"];
