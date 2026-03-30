import { components } from "@/types/api/generated";
import { SuccessResponse } from "./api.types";

// Response types from specific operations
export type LoginResponse = SuccessResponse<"auth_login">;
export type GetEditorInfoResponse = SuccessResponse<"get_editor_info">;
export type CreateEditorResponse = SuccessResponse<"create_editor">;
export type LogoutResponse = SuccessResponse<"logout_and_invalidate_sessions">;
export type RefreshTokenResponse = SuccessResponse<"refresh_access_token">;

// Request types (using component schemas)
export type LoginRequest = components["schemas"]["LoginRequest"];
export type CreateEditorRequest = components["schemas"]["CreateEditorRequest"];

// Backwards compatibility aliases
export type UserResponse = GetEditorInfoResponse;
export type AuthResponse = LoginResponse;
export type CreatedEditorResponse = CreateEditorResponse;
