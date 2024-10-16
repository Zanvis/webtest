import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { tap, map, catchError, retry, shareReplay, finalize } from 'rxjs/operators';
import { Song } from './song.service';

export interface Playlist {
  _id: string;
  name: string;
  songs: Song[];
}

@Injectable({
  providedIn: 'root'
})
export class PlaylistService {
  private apiUrl = 'https://music-app-backend-h3sd.onrender.com/api';
  private playlistsSubject = new BehaviorSubject<Playlist[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private initializationPromise: Promise<void> | null = null;

  playlists$ = this.playlistsSubject.asObservable().pipe(
    shareReplay(1)  // Share the latest value with all subscribers
  );
  loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {
    // Initialize the service when it's first injected
    this.initializeService();
  }
  private async initializeService(): Promise<void> {
    if (!this.initializationPromise) {
      this.initializationPromise = new Promise((resolve) => {
        this.loadPlaylists().subscribe({
          next: () => resolve(),
          error: (error) => {
            console.error('Error initializing playlists:', error);
            resolve(); // Resolve anyway to prevent blocking
          }
        });
      });
    }
    return this.initializationPromise;
  }

  private loadPlaylists(): Observable<Playlist[]> {
    if (this.loadingSubject.value) {
      return this.playlists$;
    }

    this.loadingSubject.next(true);

    return this.http.get<Playlist[]>(`${this.apiUrl}/playlists`).pipe(
      retry(3),
      tap(playlists => {
        if (playlists) {
          // Store playlists in localStorage as backup
          localStorage.setItem('cachedPlaylists', JSON.stringify(playlists));
          this.playlistsSubject.next(playlists);
        }
      }),
      catchError(error => {
        console.error('Error loading playlists:', error);
        // Try to load from localStorage if API fails
        const cachedPlaylists = localStorage.getItem('cachedPlaylists');
        if (cachedPlaylists) {
          const playlists = JSON.parse(cachedPlaylists);
          this.playlistsSubject.next(playlists);
          return of(playlists);
        }
        return of(this.playlistsSubject.value);
      }),
      finalize(() => {
        this.loadingSubject.next(false);
      }),
      shareReplay(1)
    );
  }

  getPlaylists(): Observable<Playlist[]> {
    return this.loadPlaylists();
  }

  createPlaylist(name: string): Observable<Playlist> {
    return this.http.post<Playlist>(`${this.apiUrl}/playlists`, { name })
      .pipe(
        tap(newPlaylist => {
          const currentPlaylists = this.playlistsSubject.value;
          this.playlistsSubject.next([...currentPlaylists, newPlaylist]);
        })
      );
  }

  addSongToPlaylist(playlistId: string, song: Song): Observable<Playlist> {
    return this.http.post<Playlist>(`${this.apiUrl}/playlists/${playlistId}/songs`, { songId: song._id })
      .pipe(
        map(updatedPlaylist => ({
          ...updatedPlaylist,
          songs: updatedPlaylist.songs.map(s => s._id === song._id ? song : s)
        })),
        tap(updatedPlaylist => {
          const currentPlaylists = this.playlistsSubject.value;
          const updatedPlaylists = currentPlaylists.map(playlist => 
            playlist._id === playlistId ? updatedPlaylist : playlist
          );
          this.playlistsSubject.next(updatedPlaylists);
        })
      );
  }

  removeSongFromPlaylist(playlistId: string, songId: string): Observable<Playlist> {
    return this.http.delete<Playlist>(`${this.apiUrl}/playlists/${playlistId}/songs/${songId}`)
      .pipe(
        tap(updatedPlaylist => {
          const currentPlaylists = this.playlistsSubject.value;
          const updatedPlaylists = currentPlaylists.map(playlist => 
            playlist._id === playlistId ? {
              ...playlist,
              songs: playlist.songs.filter(song => song._id !== songId)
            } : playlist
          );
          this.playlistsSubject.next(updatedPlaylists);
        })
      );
  }

  deletePlaylist(playlistId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/playlists/${playlistId}`).pipe(
      tap(() => {
        const currentPlaylists = this.playlistsSubject.value;
        const updatedPlaylists = currentPlaylists.filter(playlist => playlist._id !== playlistId);
        this.playlistsSubject.next(updatedPlaylists);
      }),
      catchError(error => {
        console.error('Error deleting playlist:', error);
        return throwError(() => new Error('Failed to delete playlist'));
      })
    );
  }
  refreshPlaylists(): Observable<Playlist[]> {
    return this.loadPlaylists();
  }
}