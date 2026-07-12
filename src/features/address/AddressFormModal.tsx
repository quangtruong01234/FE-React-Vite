import { useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GradientButton } from '@/components/shared/GradientButton';
import { cn } from '@/lib/format/utils';
import { AddressSelect } from './AddressSelect';
import { useProvinces, useDistricts, useWards } from './useShippingLocations';
import { useCreateAddress, useUpdateAddress } from './useAddresses';
import type { Address, CreateAddressDto } from '@/types';

const schema = z.object({
  recipientName: z
    .string()
    .trim()
    .min(1, 'Họ tên người nhận là bắt buộc')
    .max(100, 'Họ tên tối đa 100 ký tự'),
  phone: z
    .string()
    .trim()
    .min(8, 'Số điện thoại không hợp lệ')
    .max(15, 'Số điện thoại không hợp lệ')
    .regex(/^[0-9+\s-]+$/, 'Số điện thoại không hợp lệ'),
  addressLine: z
    .string()
    .trim()
    .min(1, 'Số nhà, tên đường là bắt buộc')
    .max(200, 'Địa chỉ tối đa 200 ký tự'),
});
type FormData = z.infer<typeof schema>;

/** A picked master-data option: the GHN code + its display name. */
interface Picked {
  id: number;
  name: string;
}

interface AddressFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Present → edit mode; absent → create a new address. */
  address?: Address | null;
  /** Called with the persisted address after a successful create/update. */
  onSaved?: (address: Address) => void;
}

export function AddressFormModal({
  open,
  onClose,
  address,
  onSaved,
}: AddressFormModalProps): ReactElement {
  const isEdit = !!address;

  const [province, setProvince] = useState<Picked | null>(
    address ? { id: address.provinceId, name: address.provinceName } : null,
  );
  const [district, setDistrict] = useState<Picked | null>(
    address ? { id: address.districtId, name: address.districtName } : null,
  );
  const [ward, setWard] = useState<{ code: string; name: string } | null>(
    address ? { code: address.wardCode, name: address.wardName } : null,
  );
  const [isDefault, setIsDefault] = useState(address?.isDefault ?? false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const provinces = useProvinces();
  const districts = useDistricts(province?.id ?? 0);
  const wards = useWards(district?.id ?? 0);

  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const saving = createAddress.isPending || updateAddress.isPending;
  const saveError = createAddress.error ?? updateAddress.error;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: {
      recipientName: address?.recipientName ?? '',
      phone: address?.phone ?? '',
      addressLine: address?.addressLine ?? '',
    },
  });

  function handleProvinceChange(value: string): void {
    const id = Number(value);
    const name = provinces.data?.find((p) => p.id === id)?.name ?? '';
    setProvince(id ? { id, name } : null);
    setDistrict(null);
    setWard(null);
    setLocationError(null);
  }

  function handleDistrictChange(value: string): void {
    const id = Number(value);
    const name = districts.data?.find((d) => d.id === id)?.name ?? '';
    setDistrict(id ? { id, name } : null);
    setWard(null);
    setLocationError(null);
  }

  function handleWardChange(value: string): void {
    const name = wards.data?.find((w) => w.id === value)?.name ?? '';
    setWard(value ? { code: value, name } : null);
    setLocationError(null);
  }

  async function onSubmit(data: FormData): Promise<void> {
    if (!province || !district || !ward) {
      setLocationError('Vui lòng chọn đầy đủ Tỉnh/thành, Quận/huyện và Phường/xã.');
      return;
    }
    const dto: CreateAddressDto = {
      recipientName: data.recipientName,
      phone: data.phone,
      addressLine: data.addressLine,
      provinceId: province.id,
      provinceName: province.name,
      districtId: district.id,
      districtName: district.name,
      wardCode: ward.code,
      wardName: ward.name,
      isDefault,
    };
    const saved = isEdit
      ? await updateAddress.mutateAsync({ id: address.id, data: dto })
      : await createAddress.mutateAsync(dto);
    onSaved?.(saved);
    onClose();
  }

  const inputClass = (invalid?: boolean): string =>
    cn(
      'bg-canvas-base border border-bdr rounded-tb-input',
      'px-3.5 py-2.5 text-sm text-ink-pri placeholder:text-ink-muted',
      'outline-none focus:border-accent-amber/50 transition-colors',
      invalid && 'border-accent-red',
    );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg bg-canvas-surface border-bdr text-ink-pri p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="font-display text-lg text-ink-pri">
            {isEdit ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-4 p-5 max-h-[70vh] overflow-y-auto">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-body font-medium text-[11px] text-ink-muted tracking-[0.04em] uppercase">
                Họ tên người nhận
              </label>
              <input
                {...register('recipientName')}
                placeholder="Nguyễn Văn A"
                autoComplete="name"
                className={inputClass(!!errors.recipientName)}
              />
              {errors.recipientName && (
                <p className="text-xs text-accent-red">{errors.recipientName.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-body font-medium text-[11px] text-ink-muted tracking-[0.04em] uppercase">
                Số điện thoại
              </label>
              <input
                {...register('phone')}
                placeholder="0987654321"
                autoComplete="tel"
                className={inputClass(!!errors.phone)}
              />
              {errors.phone && (
                <p className="text-xs text-accent-red">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body font-medium text-[11px] text-ink-muted tracking-[0.04em] uppercase">
              Số nhà, tên đường
            </label>
            <input
              {...register('addressLine')}
              placeholder="123 Nguyễn Huệ"
              autoComplete="address-line1"
              className={inputClass(!!errors.addressLine)}
            />
            {errors.addressLine && (
              <p className="text-xs text-accent-red">{errors.addressLine.message}</p>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <AddressSelect
              label="Tỉnh/thành phố"
              placeholder="Chọn tỉnh/thành"
              value={province ? String(province.id) : ''}
              loading={provinces.isLoading}
              options={(provinces.data ?? []).map((p) => ({ value: String(p.id), label: p.name }))}
              onChange={handleProvinceChange}
            />
            <AddressSelect
              label="Quận/huyện"
              placeholder="Chọn quận/huyện"
              value={district ? String(district.id) : ''}
              disabled={!province}
              loading={!!province && districts.isLoading}
              options={(districts.data ?? []).map((d) => ({ value: String(d.id), label: d.name }))}
              onChange={handleDistrictChange}
            />
            <AddressSelect
              label="Phường/xã"
              placeholder="Chọn phường/xã"
              value={ward ? ward.code : ''}
              disabled={!district}
              loading={!!district && wards.isLoading}
              options={(wards.data ?? []).map((w) => ({ value: w.id, label: w.name }))}
              onChange={handleWardChange}
            />
          </div>
          {locationError && <p className="text-xs text-accent-red">{locationError}</p>}

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="size-4 shrink-0 accent-accent-amber cursor-pointer"
            />
            <span className="font-body text-sm text-ink-sec">Đặt làm địa chỉ mặc định</span>
          </label>

          {saveError && (
            <p className="text-sm text-accent-red">
              {typeof saveError === 'object' && saveError !== null && 'message' in saveError
                ? String((saveError as { message: unknown }).message)
                : 'Lưu địa chỉ thất bại'}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-canvas-elevated border border-bdr rounded-tb-cta py-2.5 text-sm font-semibold text-ink-sec cursor-pointer hover:border-accent-amber/50 transition-colors"
            >
              Hủy
            </button>
            <GradientButton type="submit" disabled={saving} size="sm" className="flex-1">
              {saving && <Loader2 size={14} className="animate-spin shrink-0" />}
              {isEdit ? 'Lưu thay đổi' : 'Thêm địa chỉ'}
            </GradientButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
