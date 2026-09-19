import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "../../service/auth/authService";
import { queryKeys } from "../../service/queryKeys";
import type {
  ForgotPasswordPayload,
  LoginRequest,
  RegisterRequest,
  ResetPasswordPayload,
  UpdateProfilePayload,
  UserProfile,
} from "../../types/auth/types";
import type { AuthTokens } from "../../types/api/type";

export function useUser() {
  return useQuery<UserProfile, Error>({
    queryKey: queryKeys.auth.me,
    queryFn: () => authService.getMe(),
    enabled: authService.isAuthenticated(),
    staleTime: 60 * 1000,
    retry: false,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation<UserProfile, Error, UpdateProfilePayload>({
    mutationFn: (payload) => authService.updateProfile(payload),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(queryKeys.auth.me, updatedUser);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

export function useForgotPassword() {
  return useMutation<{ message: string }, Error, ForgotPasswordPayload>({
    mutationFn: (payload) => authService.forgotPassword(payload),
  });
}

export function useResetPassword() {
  return useMutation<{ message: string }, Error, ResetPasswordPayload>({
    mutationFn: (payload) => authService.resetPassword(payload),
  });
}

export function useAuth() {
  const queryClient = useQueryClient();
  const userQuery = useUser();
  const updateProfileMutation = useUpdateProfile();
  const forgotPasswordMutation = useForgotPassword();
  const resetPasswordMutation = useResetPassword();

  const loginMutation = useMutation<AuthTokens, Error, LoginRequest>({
    mutationFn: (payload) => authService.login(payload),
    onSuccess: async () => {
      await queryClient.fetchQuery({
        queryKey: queryKeys.auth.me,
        queryFn: () => authService.getMe(),
      });
    },
  });

  const registerMutation = useMutation<AuthTokens, Error, RegisterRequest>({
    mutationFn: (payload) => authService.register(payload),
    onSuccess: async () => {
      await queryClient.fetchQuery({
        queryKey: queryKeys.auth.me,
        queryFn: () => authService.getMe(),
      });
    },
  });

  const logout = () => {
    authService.logout();
    queryClient.clear();
  };

  return {
    user: userQuery.data ?? null,
    isUserLoading: userQuery.isLoading,
    userError: userQuery.error,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,
    updateProfileError: updateProfileMutation.error,
    forgotPassword: forgotPasswordMutation.mutateAsync,
    isSendingForgotPassword: forgotPasswordMutation.isPending,
    forgotPasswordError: forgotPasswordMutation.error,
    resetPassword: resetPasswordMutation.mutateAsync,
    isResettingPassword: resetPasswordMutation.isPending,
    resetPasswordError: resetPasswordMutation.error,
    logout,
    isAuthenticated: authService.isAuthenticated,
    refetchUser: userQuery.refetch,
  };
}
