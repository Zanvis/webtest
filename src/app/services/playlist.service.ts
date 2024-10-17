import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { tap, catchError, switchMap, map } from 'rxjs/operators';
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
  playlists$ = this.playlistsSubject.asObservable();
  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadInitialPlaylists();
  }

  private loadInitialPlaylists(): void {
    const cachedPlaylists = this.getCachedPlaylists();
    if (cachedPlaylists.length > 0) {
      this.playlistsSubject.next(cachedPlaylists);
    }
    this.refreshPlaylists().subscribe();
  }

  private getCachedPlaylists(): Playlist[] {
    if (this.isLocalStorageAvailable()) {
      const cachedData = localStorage.getItem('playlists');
      return cachedData ? JSON.parse(cachedData) : [];
    }
    return [];
  }

  private setCachedPlaylists(playlists: Playlist[]): void {
    if (this.isLocalStorageAvailable()) {
      localStorage.setItem('playlists', JSON.stringify(playlists));
    }
  }

  private isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  refreshPlaylists(): Observable<Playlist[]> {
    this.loadingSubject.next(true);
    return this.http.get<Playlist[]>(`${this.apiUrl}/playlists`).pipe(
      tap(playlists => {
        this.playlistsSubject.next(playlists);
        this.setCachedPlaylists(playlists);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Error loading playlists:', error);
        this.loadingSubject.next(false);
        return throwError(() => new Error('Failed to load playlists'));
      })
    );
  }

  getPlaylists(): Observable<Playlist[]> {
    return this.playlists$;
  }

  createPlaylist(name: string): Observable<Playlist> {
    return this.http.post<Playlist>(`${this.apiUrl}/playlists`, { name }).pipe(
      switchMap(newPlaylist => {
        return this.refreshPlaylists().pipe(
          map(() => newPlaylist)
        );
      })
    );
  }

  addSongToPlaylist(playlistId: string, song: Song): Observable<Playlist> {
    return this.http.post<Playlist>(`${this.apiUrl}/playlists/${playlistId}/songs`, { songId: song._id }).pipe(
      switchMap(() => this.refreshPlaylists()),
      map(playlists => playlists.find(p => p._id === playlistId)!)
    );
  }

  removeSongFromPlaylist(playlistId: string, songId: string): Observable<Playlist> {
    return this.http.delete<Playlist>(`${this.apiUrl}/playlists/${playlistId}/songs/${songId}`).pipe(
      switchMap(() => this.refreshPlaylists()),
      map(playlists => playlists.find(p => p._id === playlistId)!)
    );
  }

  deletePlaylist(playlistId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/playlists/${playlistId}`).pipe(
      switchMap(() => this.refreshPlaylists()),
      tap(() => {
        // Update the cached playlists after successful deletion
        const currentPlaylists = this.playlistsSubject.getValue();
        const updatedPlaylists = currentPlaylists.filter(p => p._id !== playlistId);
        this.playlistsSubject.next(updatedPlaylists);
        this.setCachedPlaylists(updatedPlaylists);
      }),
      catchError(error => {
        console.error('Error deleting playlist:', error);
        return throwError(() => new Error('Failed to delete playlist'));
      })
    );
  }
}