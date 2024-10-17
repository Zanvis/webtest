import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { tap, map, catchError, retry, shareReplay, switchMap } from 'rxjs/operators';
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
    this.loadPlaylists().subscribe();
  }

  loadPlaylists(): Observable<Playlist[]> {
    if (this.loadingSubject.value) {
      return this.playlists$;
    }

    this.loadingSubject.next(true);
    return this.http.get<Playlist[]>(`${this.apiUrl}/playlists`).pipe(
      retry(3),
      tap(playlists => {
        this.playlistsSubject.next(playlists);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Error loading playlists:', error);
        this.loadingSubject.next(false);
        return throwError(() => new Error('Failed to load playlists'));
      }),
      shareReplay(1)
    );
  }

  getPlaylists(): Observable<Playlist[]> {
    return this.loadPlaylists();
  }

  createPlaylist(name: string): Observable<Playlist> {
    return this.http.post<Playlist>(`${this.apiUrl}/playlists`, { name }).pipe(
      switchMap(newPlaylist => {
        return this.loadPlaylists().pipe(
          map(() => newPlaylist)
        );
      })
    );
  }

  addSongToPlaylist(playlistId: string, song: Song): Observable<Playlist> {
    return this.http.post<Playlist>(`${this.apiUrl}/playlists/${playlistId}/songs`, { songId: song._id }).pipe(
      switchMap(() => this.loadPlaylists()),
      map(playlists => playlists.find(p => p._id === playlistId)!),
      tap(() => {
        // Optionally update the local state if needed
        const currentPlaylists = this.playlistsSubject.value;
        const updatedPlaylists = currentPlaylists.map(playlist => 
          playlist._id === playlistId ? {
            ...playlist,
            songs: [...playlist.songs, song]
          } : playlist
        );
        this.playlistsSubject.next(updatedPlaylists);
      })
    );
  }

  removeSongFromPlaylist(playlistId: string, songId: string): Observable<Playlist> {
    return this.http.delete<Playlist>(`${this.apiUrl}/playlists/${playlistId}/songs/${songId}`).pipe(
      switchMap(() => this.loadPlaylists()),
      map(playlists => playlists.find(p => p._id === playlistId)!),
      tap(() => {
        // Optionally update the local state if needed
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
      switchMap(() => this.loadPlaylists()),
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