import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
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
  // private apiUrl = 'http://localhost:3000/api';
  private apiUrl = 'https://music-app-backend-h3sd.onrender.com/api';
  private playlistsSubject = new BehaviorSubject<Playlist[]>([]);
  playlists$ = this.playlistsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadPlaylists();
  }

  private loadPlaylists(): void {
    this.http.get<Playlist[]>(`${this.apiUrl}/playlists`)
      .subscribe(playlists => this.playlistsSubject.next(playlists));
  }

  getPlaylists(): Observable<Playlist[]> {
    return this.playlists$;
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

  // addSongToPlaylist(playlistId: string, song: Song): Observable<Playlist> {
  //   return this.http.post<Playlist>(`${this.apiUrl}/playlists/${playlistId}/songs`, { songId: song._id })
  //     .pipe(
  //       tap(updatedPlaylist => {
  //         const currentPlaylists = this.playlistsSubject.value;
  //         const updatedPlaylists = currentPlaylists.map(playlist => 
  //           playlist._id === playlistId ? updatedPlaylist : playlist
  //         );
  //         this.playlistsSubject.next(updatedPlaylists);
  //       })
  //     );
  // }
  addSongToPlaylist(playlistId: string, song: Song): Observable<Playlist> {
    // Optimistic update
    const currentPlaylists = this.playlistsSubject.value;
    const updatedPlaylists = currentPlaylists.map(playlist => {
      if (playlist._id === playlistId) {
        return { ...playlist, songs: [...playlist.songs, song] };
      }
      return playlist;
    });
    this.playlistsSubject.next(updatedPlaylists);
  
    return this.http.post<Playlist>(`${this.apiUrl}/playlists/${playlistId}/songs`, { songId: song._id })
      .pipe(
        tap(updatedPlaylist => {
          const currentPlaylists = this.playlistsSubject.value;
          const serverUpdatedPlaylists = currentPlaylists.map(playlist => 
            playlist._id === playlistId ? updatedPlaylist : playlist
          );
          this.playlistsSubject.next(serverUpdatedPlaylists);
        }),
        catchError(error => {
          // Revert the optimistic update if the server request fails
          this.playlistsSubject.next(currentPlaylists);
          return throwError(error);
        })
      );
  }
  // removeSongFromPlaylist(playlistId: string, songId: string): Observable<Playlist> {
  //   return this.http.delete<Playlist>(`${this.apiUrl}/playlists/${playlistId}/songs/${songId}`)
  //     .pipe(
  //       tap(updatedPlaylist => {
  //         const currentPlaylists = this.playlistsSubject.value;
  //         const updatedPlaylists = currentPlaylists.map(playlist => 
  //           playlist._id === playlistId ? updatedPlaylist : playlist
  //         );
  //         this.playlistsSubject.next(updatedPlaylists);
  //       })
  //     );
  // }
  removeSongFromPlaylist(playlistId: string, songId: string): Observable<Playlist> {
    // Optimistic update
    const currentPlaylists = this.playlistsSubject.value;
    const updatedPlaylists = currentPlaylists.map(playlist => {
      if (playlist._id === playlistId) {
        return { ...playlist, songs: playlist.songs.filter(song => song._id !== songId) };
      }
      return playlist;
    });
    this.playlistsSubject.next(updatedPlaylists);
  
    return this.http.delete<Playlist>(`${this.apiUrl}/playlists/${playlistId}/songs/${songId}`)
      .pipe(
        tap(updatedPlaylist => {
          const currentPlaylists = this.playlistsSubject.value;
          const serverUpdatedPlaylists = currentPlaylists.map(playlist => 
            playlist._id === playlistId ? updatedPlaylist : playlist
          );
          this.playlistsSubject.next(serverUpdatedPlaylists);
        }),
        catchError(error => {
          // Revert the optimistic update if the server request fails
          this.playlistsSubject.next(currentPlaylists);
          return throwError(error);
        })
      );
  }
  deletePlaylist(playlistId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/playlists/${playlistId}`)
      .pipe(
        tap(() => {
          const currentPlaylists = this.playlistsSubject.value;
          const updatedPlaylists = currentPlaylists.filter(playlist => playlist._id !== playlistId);
          this.playlistsSubject.next(updatedPlaylists);
        })
      );
  }
}