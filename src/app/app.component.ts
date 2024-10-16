import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AudioPlayerComponent } from './components/audio-player/audio-player.component';
import { SongListComponent } from './components/song-list/song-list.component';
import { SongUploadComponent } from './components/song-upload/song-upload.component';
import { TeamComponent } from './components/team/team.component';
import { LandingComponent } from './components/landing/landing.component';
import { PlaylistComponent } from './components/playlist/playlist.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, AudioPlayerComponent, SongListComponent, SongUploadComponent, TeamComponent, LandingComponent, RouterLinkActive, PlaylistComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'frontend';
  isMenuOpen = false;
  currentYear = new Date().getFullYear();
  
  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }
}
