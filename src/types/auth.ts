// --- Auth ---

export interface LoginDto {
  username: string;
  password: string;
  // Optional: true → backend extends the auth cookie + JWT to 7 days
  // (omitted/false → default 5h session). Must be a real boolean, never a string.
  rememberMe?: boolean;
}

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
}

// Forgot-password flow (both endpoints public). forgot-password always returns
// the same neutral 201 whether or not the email exists (anti-enumeration).
export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  code: string; // exactly 6 digits
  newPassword: string; // min 6 chars
}
