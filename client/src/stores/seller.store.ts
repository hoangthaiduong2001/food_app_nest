import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SellerCredentials {
  apiKey: string
  secretKey: string
}

interface SellerState {
  credentials: SellerCredentials | null
  setCredentials: (creds: SellerCredentials) => void
  clearCredentials: () => void
}

export const useSellerStore = create<SellerState>()(
  persist(
    (set) => ({
      credentials: null,
      setCredentials: (creds) => set({ credentials: creds }),
      clearCredentials: () => set({ credentials: null }),
    }),
    {
      name: 'seller-credentials',
    },
  ),
)
