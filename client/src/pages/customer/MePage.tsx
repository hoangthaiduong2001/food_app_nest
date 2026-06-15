import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { User, Mail, Phone, MapPin, Camera, ShieldCheck } from 'lucide-react'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { getErrorMessage } from '@/lib/api'

const schema = z.object({
  name: z.string().min(1).max(100).optional().or(z.literal('')),
  phoneNumber: z.string().min(10).max(15).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  avatar: z.string().max(1000).optional().or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

export default function MePage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: authService.me,
  })

  const { register, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  // Populate form khi data load xong
  useEffect(() => {
    if (profile) {
      reset({
        name: profile.username,
        phoneNumber: profile.phone,
        address: profile.address ?? '',
        avatar: profile.avatar ?? '',
      })
    }
  }, [profile, reset])

  const update = useMutation({
    mutationFn: (values: FormValues) =>
      authService.updateProfile({
        name: values.name || undefined,
        phoneNumber: values.phoneNumber || undefined,
        address: values.address || null,
        avatar: values.avatar || null,
      }),
    onSuccess: (updated) => {
      toast.success(t('me.updateSuccess'))
      qc.invalidateQueries({ queryKey: ['me'] })
      setUser(updated)
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const avatarUrl = watch('avatar')

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('me.title')}</h1>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {/* Avatar header */}
        <div className="flex items-center gap-5 border-b border-gray-100 bg-gray-50/60 px-6 py-5">
          <div className="relative h-20 w-20 flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={profile?.username}
                className="h-20 w-20 rounded-full object-cover ring-2 ring-white shadow"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 ring-2 ring-white shadow">
                <User className="h-9 w-9 text-blue-400" />
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 shadow">
              <Camera className="h-3 w-3 text-white" />
            </div>
          </div>

          <div>
            <p className="text-lg font-semibold text-gray-900">{profile?.username}</p>
            <p className="text-sm text-gray-400">{profile?.email}</p>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
              <ShieldCheck className="h-3 w-3" />
              {profile?.roleName}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit((d) => update.mutate(d))} className="space-y-5 px-6 py-6">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-gray-400" />
              {t('me.name')}
            </Label>
            <Input {...register('name')} placeholder={t('me.namePlaceholder')} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          {/* Email — read only */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-gray-400" />
              {t('me.email')}
            </Label>
            <Input value={profile?.email ?? ''} disabled className="bg-gray-50 text-gray-400 cursor-not-allowed" />
            <p className="text-xs text-gray-400">{t('me.emailReadOnly')}</p>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-gray-400" />
              {t('me.phone')}
            </Label>
            <Input {...register('phoneNumber')} placeholder="0901234567" />
            {errors.phoneNumber && <p className="text-xs text-red-500">{errors.phoneNumber.message}</p>}
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-gray-400" />
              {t('me.address')}
            </Label>
            <Input {...register('address')} placeholder={t('me.addressPlaceholder')} />
            {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
          </div>

          {/* Avatar URL */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5 text-gray-400" />
              {t('me.avatarUrl')}
            </Label>
            <Input {...register('avatar')} placeholder="https://..." />
            {errors.avatar && <p className="text-xs text-red-500">{errors.avatar.message}</p>}
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full"
              disabled={update.isPending || !isDirty}
            >
              {update.isPending && <Spinner size="sm" className="mr-2" />}
              {t('me.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
