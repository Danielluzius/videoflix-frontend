import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';
import { environment } from '../../../environments/environment';

export interface Video {
  id: number;
  title: string;
  description: string;
  category: string;
  thumbnail_url: string;
  preview_clip_url: string | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class VideoService {
  private api = inject(ApiService);

  getVideos(): Observable<ApiResponse> {
    return this.api.get('video/');
  }

  getNewestVideos(videos: Video[]): Video[] {
    return videos
      .filter((v) => v.preview_clip_url)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 10);
  }

  getHlsUrl(id: number): string {
    return `${environment.apiBaseUrl}video/${id}/master.m3u8`;
  }
}
