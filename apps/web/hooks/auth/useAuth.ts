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
  VerifyEmailPayload,
} from "../../types/auth/types";

export function useUser() {
  return useQuery<UserProfile, Error>({
    queryKey: queryKeys.auth.me,
    queryFn: () => authService.getMe(),
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

export function useVerifyEmail() {
  return useMutation<void, Error, VerifyEmailPayload>({
    mutationFn: (payload) => authService.verifyEmail(payload),
  });
}

export function useAuth() {
  const queryClient = useQueryClient();
  const userQuery = useUser();
  const updateProfileMutation = useUpdateProfile();
  const forgotPasswordMutation = useForgotPassword();
  const resetPasswordMutation = useResetPassword();
  const verifyEmailMutation = useVerifyEmail();

  const loginMutation = useMutation<void, Error, LoginRequest>({
    mutationFn: (payload) => authService.login(payload),
    onSuccess: async () => {
      await queryClient.fetchQuery({
        queryKey: queryKeys.auth.me,
        queryFn: () => authService.getMe(),
      });
    },
  });

  const registerMutation = useMutation<UserProfile, Error, RegisterRequest>({
    mutationFn: (payload) => authService.register(payload),
  });

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      queryClient.clear();
    }
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
    verifyEmail: verifyEmailMutation.mutateAsync,
    isVerifyingEmail: verifyEmailMutation.isPending,
    verifyEmailError: verifyEmailMutation.error,
    resetPassword: resetPasswordMutation.mutateAsync,
    isResettingPassword: resetPasswordMutation.isPending,
    resetPasswordError: resetPasswordMutation.error,
    logout,
    isAuthenticated: () => Boolean(userQuery.data),
    refetchUser: userQuery.refetch,
  };
}
