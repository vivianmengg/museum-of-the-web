// Museum object from any source API — normalized shape
export type MuseumObject = {
  // Namespaced: "met-123456" or "aic-456789"
  id: string
  institution: 'met' | 'aic' | 'rijks' | 'moma'
  title: string
  date: string
  culture: string
  medium: string
  imageUrl: string | null
  thumbnailUrl: string | null
  imageWidth: number
  imageHeight: number
  department: string
  artistName: string
  creditLine: string
  dimensions: string
  objectUrl: string | null
}

// Supabase row types
export type Trace = {
  id: string
  user_id: string
  object_id: string
  institution: string
  text: string
  created_at: string
  users?: { username: string; avatar_url: string | null; is_anonymous: boolean }
}

export type Exhibit = {
  id: string
  user_id: string
  title: string
  statement: string
  is_public: boolean
  is_featured: boolean
  created_at: string
  users?: { username: string; avatar_url: string | null }
  exhibit_objects?: ExhibitObject[]
}

export type ExhibitObject = {
  id: string
  exhibit_id: string
  object_id: string
  institution: string
  curator_note: string
  position: number
}

export type UserProfile = {
  id: string
  username: string
  avatar_url: string | null
  created_at: string
}
