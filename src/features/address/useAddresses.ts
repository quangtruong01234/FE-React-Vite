import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import type { Address, CreateAddressDto, UpdateAddressDto } from '@/types';

export function useAddresses() {
  return useQuery<Address[]>({
    queryKey: queryKeys.users.addresses,
    queryFn: () => api.users.getAddresses(),
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAddressDto) => api.users.createAddress(data),
    onSuccess: () => {
      // A create can flip the default flag on siblings — refetch the whole book.
      queryClient.invalidateQueries({ queryKey: queryKeys.users.addresses });
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAddressDto }) =>
      api.users.updateAddress(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.addresses });
    },
  });
}

export function useSetDefaultAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.users.setDefaultAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.addresses });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.users.deleteAddress(id),
    onSuccess: () => {
      // Deleting the default auto-promotes another — refetch to reflect it.
      queryClient.invalidateQueries({ queryKey: queryKeys.users.addresses });
    },
  });
}
