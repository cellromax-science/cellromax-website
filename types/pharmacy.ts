export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  address_detail: string | null;
  city: string | null;
  district: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NearbyPharmacy extends Pick<Pharmacy, 'id' | 'name' | 'address' | 'phone' | 'latitude' | 'longitude'> {
  distance_km: number;
}
