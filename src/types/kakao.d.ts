declare namespace kakao.maps {
  function load(callback: () => void): void

  class LatLng {
    constructor(lat: number, lng: number)
    getLat(): number
    getLng(): number
  }

  class Map {
    constructor(container: HTMLElement, options: { center: LatLng; level: number })
    setCenter(latlng: LatLng): void
    getCenter(): LatLng
    setLevel(level: number): void
    getLevel(): number
  }

  class Marker {
    constructor(options: { position: LatLng; map?: Map })
    setMap(map: Map | null): void
    getPosition(): LatLng
  }

  class InfoWindow {
    constructor(options: { content: string; removable?: boolean })
    open(map: Map, marker: Marker): void
    close(): void
  }

  class CustomOverlay {
    constructor(options: { content: string; position: LatLng; map?: Map; yAnchor?: number })
    setMap(map: Map | null): void
  }

  namespace services {
    const Status: { OK: 'OK'; ZERO_RESULT: 'ZERO_RESULT'; ERROR: 'ERROR' }
    type SortBy = 'accuracy' | 'distance'

    interface PlacesSearchResult {
      id: string
      place_name: string
      category_name: string
      category_group_code: string
      phone: string
      address_name: string
      road_address_name: string
      x: string // lng
      y: string // lat
      distance: string
    }

    interface Pagination {
      totalCount: number
      hasNextPage: boolean
      nextPage(): void
    }

    class Places {
      keywordSearch(
        keyword: string,
        callback: (result: PlacesSearchResult[], status: Status, pagination: Pagination) => void,
        options?: { location?: LatLng; radius?: number; sort?: SortBy; size?: number; page?: number }
      ): void
      categorySearch(
        code: string,
        callback: (result: PlacesSearchResult[], status: Status, pagination: Pagination) => void,
        options?: { location?: LatLng; radius?: number; sort?: SortBy; bounds?: any }
      ): void
    }
  }
}

interface Window {
  kakao: typeof kakao
}
