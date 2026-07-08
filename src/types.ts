export interface Movie {
  id: string;
  title: string;
  genre: string[];
  year: number;
  director: string;
  rating: number;
  description: string;
  poster: string;
}

export interface Review {
  id: string;
  movieId: string;
  userId: string;
  userName: string;
  comment: string;
  timestamp: string;
}

export interface Rating {
  movieId: string;
  userId: string;
  rating: number;
  timestamp: string;
}
