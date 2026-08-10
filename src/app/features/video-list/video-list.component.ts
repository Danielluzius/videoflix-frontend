import {
  Component,
  HostListener,
  OnInit,
  OnDestroy,
  inject,
  ElementRef,
  ViewChild,
} from '@angular/core';
import Hls from 'hls.js';
import Plyr from 'plyr';
import { VideoService, Video } from '../../core/services/video.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-video-list',
  standalone: true,
  imports: [],
  templateUrl: './video-list.component.html',
  styleUrl: './video-list.component.scss',
})
export class VideoListComponent implements OnInit, OnDestroy {
  @ViewChild('videoPlayer') videoPlayerRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('overlayVideo') overlayVideoRef!: ElementRef<HTMLVideoElement>;

  private videoService = inject(VideoService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  videos: Video[] = [];
  newestVideos: Video[] = [];
  categories: string[] = [];

  videoTitle = 'Oops... there are no videos !';
  videoDescription = '';
  loadError = false;

  currentVideo: number | null = null;
  overlayOpen = false;
  overlayTitle = '';
  currentThumbnailUrl = '';
  thumbnailVisible = true;
  previewVideoReady = false;
  titleFading = false;
  previewVisible = true;

  /** Bound to .video-wrapper — drives overlay top-bar and info visibility via CSS. */
  controlsHidden = false;
  overlayPlaying = false;
  plyrFullscreen = false;

  private hls: Hls | null = null;
  private overlayHls: Hls | null = null;
  private plyr: Plyr | null = null;
  private previewEndedListener: (() => void) | null = null;
  private previewTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly PREVIEW_DURATION_MS = 16_000;
  private autoAdvanceStopped = false;

  infoCardOpen = false;
  infoCardTitle = '';
  infoCardDescription = '';
  infoCardThumbnailUrl = '';
  private infoCardVideoId: number | null = null;

  private resizeObservers: ResizeObserver[] = [];
  private resizeListeners: Array<() => void> = [];
  private dragCleanups: Array<() => void> = [];
  private focusCleanups: Array<() => void> = [];
  private initializedLists = new WeakSet<HTMLElement>();

  ngOnInit(): void {
    this.authService.startTokenRefreshInterval();
    this.loadVideos();
  }

  ngOnDestroy(): void {
    this.authService.stopTokenRefreshInterval();
    this.hls?.destroy();
    this.overlayHls?.destroy();
    this.plyr?.destroy();
    if (this.previewTimer) clearTimeout(this.previewTimer);
    const videoEl = this.videoPlayerRef?.nativeElement;
    if (videoEl && this.previewEndedListener) {
      videoEl.removeEventListener('ended', this.previewEndedListener);
    }
    this.resizeObservers.forEach((o) => o.disconnect());
    this.resizeListeners.forEach((fn) =>
      window.removeEventListener('resize', fn),
    );
    this.dragCleanups.forEach((fn) => fn());
    this.focusCleanups.forEach((fn) => fn());
  }

  getVideosForCategory(cat: string): Video[] {
    return this.videos.filter((v) => v.category.toLowerCase() === cat);
  }

  private loadVideos(): void {
    this.videoService.getVideos().subscribe({
      next: (r) =>
        r.ok
          ? this.handleVideosLoaded(r.data as Video[])
          : this.handleLoadError(),
      error: () => this.handleLoadError(),
    });
  }

  private handleVideosLoaded(videos: Video[]): void {
    this.videos = videos;
    this.newestVideos = this.videoService.getNewestVideos(videos);
    const cats = new Set(videos.map((v) => v.category.toLowerCase()));
    this.categories = [...cats].filter((c) => c !== 'newest');
    if (videos.length > 0) this.initFirstVideo(videos[0]);
  }

  private initFirstVideo(video: Video): void {
    this.videoTitle = video.title;
    this.videoDescription = video.description;
    this.currentVideo = video.id;
    this.currentThumbnailUrl = video.thumbnail_url;
    setTimeout(() => {
      this.loadVideo(video.id, '480p');
      this.initScrollIndicators();
    }, 0);
    setTimeout(() => {
      this.initScrollIndicators();
      this.initCategoryFocus();
    }, 100);
  }

  private handleLoadError(): void {
    this.loadError = true;
    this.toast.showToastMessage(true, ['Failed to load videos']);
  }

  showVideo(id: number): void {
    this.autoAdvanceStopped = true;
    this.currentVideo = id;
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
      this.previewTimer = null;
    }
    this.videoPlayerRef?.nativeElement?.pause();
    this.openInfoCard(id);
  }

  playVideo(id?: number): void {
    const target = id ?? this.currentVideo;
    if (target != null) this.openVideoOverlay(target);
  }

  // ── Preview player ────────────────────────────────────────────────

  private loadVideo(id: number, _resolution: string): void {
    const el = this.videoPlayerRef?.nativeElement;
    if (!el) return;
    this.cleanupPreviewPlayer(el);
    this.attachPreviewListeners(el);
    const url = this.videos.find((v) => v.id === id)?.preview_clip_url;
    url ? this.loadPreviewClip(el, url) : this.loadPreviewHls(el, id);
  }

  private cleanupPreviewPlayer(el: HTMLVideoElement): void {
    if (this.previewEndedListener) {
      el.removeEventListener('ended', this.previewEndedListener);
      this.previewEndedListener = null;
    }
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
      this.previewTimer = null;
    }
    this.hls?.destroy();
    this.hls = null;
    this.previewVideoReady = false;
  }

  private attachPreviewListeners(el: HTMLVideoElement): void {
    el.addEventListener(
      'canplay',
      () => {
        this.previewVideoReady = true;
      },
      { once: true },
    );
    const startTimer = () => {
      el.removeEventListener('playing', startTimer);
      if (this.autoAdvanceStopped || this.previewTimer) return;
      this.previewTimer = setTimeout(
        () => this.onPreviewEnded(),
        this.PREVIEW_DURATION_MS,
      );
    };
    el.addEventListener('playing', startTimer);
    this.previewEndedListener = () => this.onPreviewEnded();
    el.addEventListener('ended', this.previewEndedListener);
  }

  private loadPreviewClip(el: HTMLVideoElement, url: string): void {
    el.muted = true;
    el.src = url;
    el.loop = true;
    el.addEventListener(
      'loadedmetadata',
      () => {
        el.playbackRate = 0.5;
      },
      { once: true },
    );
    el.load();
    el.play().catch(() => {});
  }

  private loadPreviewHls(el: HTMLVideoElement, id: number): void {
    this.hls = this.createHlsInstance();
    this.hls.loadSource(this.videoService.getHlsUrl(id));
    this.hls.attachMedia(el);
    this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
      el.loop = true;
      el.addEventListener(
        'loadedmetadata',
        () => {
          el.playbackRate = 0.5;
        },
        { once: true },
      );
      el.play().catch(() => {});
    });
    this.hls.on(Hls.Events.ERROR, (_e, d) => {
      if (d.fatal) console.error('HLS fatal error:', d);
    });
  }

  private onPreviewEnded(): void {
    if (this.titleFading || this.autoAdvanceStopped) return;
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
      this.previewTimer = null;
    }
    const nextIdx = this.getNextPreviewIndex();
    if (nextIdx === -1) return;
    this.titleFading = true;
    this.previewVideoReady = false;
    this.thumbnailVisible = false;
    setTimeout(
      () => this.transitionToNextVideo(this.newestVideos[nextIdx], nextIdx),
      500,
    );
  }

  private getNextPreviewIndex(): number {
    const idx = this.newestVideos.findIndex((v) => v.id === this.currentVideo);
    return idx === -1 ? -1 : (idx + 1) % this.newestVideos.length;
  }

  private transitionToNextVideo(next: Video, nextIdx: number): void {
    this.videoTitle = next.title;
    this.videoDescription = next.description;
    this.currentVideo = next.id;
    this.currentThumbnailUrl = next.thumbnail_url;
    this.thumbnailVisible = true;
    this.loadVideo(next.id, '480p');
    setTimeout(() => this.scrollPreviewThumbnailIntoView(nextIdx), 50);
    setTimeout(() => {
      this.titleFading = false;
    }, 50);
  }

  private scrollPreviewThumbnailIntoView(idx: number): void {
    const ul = document.getElementById('newest') as HTMLElement | null;
    const li = ul?.querySelectorAll('li')[idx] as HTMLElement | undefined;
    if (ul && li) {
      ul.scrollTo({
        left: li.offsetLeft - ul.clientWidth / 2 + li.offsetWidth / 2,
        behavior: 'smooth',
      });
    }
    if (ul) this.updateScrollIndicator(ul);
  }

  // ── Video overlay ─────────────────────────────────────────────────

  openVideoOverlay(videoId: number, autoPlay = true): void {
    const video = this.videos.find((v) => v.id === videoId);
    if (!video) return;
    this.overlayOpen = true;
    this.overlayTitle = video.title;
    document.body.classList.add('overlay-open');
    document.body.style.overflow = 'hidden';
    this.hideHeader();
    setTimeout(() => this.loadVideoInOverlay(videoId, autoPlay), 0);
  }

  closeVideoOverlay(): void {
    this.destroyOverlayPlayers();
    this.resetOverlayState();
    this.resumePreviewPlayer();
  }

  openInfoCard(id: number): void {
    const video = this.videos.find((v) => v.id === id);
    if (!video) return;
    this.infoCardVideoId = id;
    this.infoCardTitle = video.title;
    this.infoCardDescription = video.description;
    this.infoCardThumbnailUrl = video.thumbnail_url;
    this.infoCardOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeInfoCard(): void {
    this.infoCardOpen = false;
    this.infoCardVideoId = null;
    document.body.style.overflow = 'auto';
    this.resumePreviewPlayer();
  }

  playFromInfoCard(): void {
    const id = this.infoCardVideoId;
    if (id == null) return;
    this.infoCardOpen = false;
    this.infoCardVideoId = null;
    this.previewVisible = false;
    this.openVideoOverlay(id);
  }

  private destroyOverlayPlayers(): void {
    if ((this.plyr as any)?.fullscreen?.active) {
      (this.plyr as any).fullscreen.exit();
    }
    const el = document.getElementById('overlayVideo') as any;
    if (el?.webkitDisplayingFullscreen && el.webkitExitFullscreen) {
      el.webkitExitFullscreen();
    }
    this.overlayHls?.destroy();
    this.overlayHls = null;
    this.plyr?.destroy();
    this.plyr = null;
  }

  private resetOverlayState(): void {
    this.overlayOpen = false;
    this.controlsHidden = false;
    this.overlayPlaying = false;
    this.plyrFullscreen = false;
    document.body.classList.remove('overlay-open');
    document.body.style.overflow = 'auto';
    this.showHeader();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = document as any;
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      (doc.exitFullscreen ?? doc.webkitExitFullscreen)
        .call(doc)
        .catch(() => {});
    }
  }

  private resumePreviewPlayer(): void {
    this.autoAdvanceStopped = false;
    this.thumbnailVisible = true;
    this.previewVisible = true;
    const el = this.videoPlayerRef?.nativeElement;
    if (!el) return;
    el.play().catch(() => {});
    if (this.previewTimer) clearTimeout(this.previewTimer);
    this.previewTimer = setTimeout(
      () => this.onPreviewEnded(),
      this.PREVIEW_DURATION_MS,
    );
  }

  private loadVideoInOverlay(id: number, autoPlay: boolean): void {
    const el = document.getElementById(
      'overlayVideo',
    ) as HTMLVideoElement | null;
    if (!el) return;
    this.destroyOverlayPlayers();
    el.removeAttribute('src');
    el.load();
    el.addEventListener(
      'webkitendfullscreen',
      () => {
        if (this.overlayOpen) this.closeVideoOverlay();
      },
      { once: true },
    );
    this.overlayHls = this.createHlsInstance();
    this.overlayHls.loadSource(this.videoService.getHlsUrl(id));
    this.overlayHls.attachMedia(el);
    this.overlayHls.on(Hls.Events.MANIFEST_PARSED, () =>
      this.onOverlayHlsReady(el, autoPlay),
    );
    this.overlayHls.on(Hls.Events.ERROR, (_e, d) => {
      if (d.fatal) console.error('HLS overlay error:', d);
    });
  }

  private onOverlayHlsReady(el: HTMLVideoElement, autoPlay: boolean): void {
    this.plyr = this.createPlyrInstance(el, this.overlayHls!);
    setTimeout(() => {
      this.trackPlyrState();
      this.attachVideoClickHandler();
    }, 0);
    if (autoPlay) setTimeout(() => this.plyr?.play(), 2000);
  }

  private createPlyrInstance(el: HTMLVideoElement, hls: Hls): Plyr {
    const heights = hls.levels.map((l) => l.height).reverse();
    heights.push(0);
    return new Plyr(el, {
      controls: [
        'play',
        'progress',
        'current-time',
        'mute',
        'volume',
        'settings',
        'pip',
        'fullscreen',
      ],
      clickToPlay: false,
      settings: ['quality'],
      fullscreen: { container: '.video-wrapper' },
      quality: {
        default: 0,
        options: heights,
        forced: true,
        onChange: (q: number) => this.onQualityChange(q, hls),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      i18n: { qualityLabel: { 0: 'Auto' } } as any,
    });
  }

  private onQualityChange(quality: number, hls: Hls): void {
    hls.currentLevel =
      quality === 0 ? -1 : hls.levels.findIndex((l) => l.height === quality);
  }

  private trackPlyrState(): void {
    if (!this.plyr) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = this.plyr as any;
    p.on('controlshidden', () => {
      this.controlsHidden = true;
    });
    p.on('controlsshown', () => {
      this.controlsHidden = false;
    });
    p.on('playing', () => {
      this.overlayPlaying = true;
    });
    p.on('pause', () => {
      this.overlayPlaying = false;
    });
    p.on('enterfullscreen', () => {
      this.plyrFullscreen = true;
    });
    p.on('exitfullscreen', () => {
      this.plyrFullscreen = false;
    });
  }

  private attachVideoClickHandler(): void {
    const wrapper = document.querySelector<HTMLElement>('.plyr__video-wrapper');
    if (!wrapper) return;
    wrapper.addEventListener('click', (e) => {
      e.stopPropagation();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.plyr as any)?.togglePlay?.();
    });
  }
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.overlayOpen) this.closeVideoOverlay();
      else if (this.infoCardOpen) this.closeInfoCard();
    }
  }

  // ── Header hide / show ────────────────────────────────────────────

  private hideHeader(): void {
    const header = document.querySelector<HTMLElement>('.main_header');
    if (!header) return;
    header.style.transform = 'translateY(-100%)';
    header.style.opacity = '0';
    header.style.transition =
      'transform 0.3s ease-in-out, opacity 0.3s ease-in-out';
  }

  private showHeader(): void {
    const header = document.querySelector<HTMLElement>('.main_header');
    if (!header) return;
    header.style.transform = 'translateY(0)';
    header.style.opacity = '1';
    header.style.transition =
      'transform 0.3s ease-in-out, opacity 0.3s ease-in-out';
  }

  // ── Scroll indicators ─────────────────────────────────────────────

  private initScrollIndicators(): void {
    document.querySelectorAll('.video_list ul').forEach((list) => {
      const ul = list as HTMLElement;
      if (this.initializedLists.has(ul)) return;
      this.initializedLists.add(ul);
      this.setupScrollListeners(ul);
      this.setupDragScroll(ul);
    });
  }

  private setupScrollListeners(ul: HTMLElement): void {
    this.updateScrollIndicator(ul);
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => this.updateScrollIndicator(ul));
      ro.observe(ul);
      if (ul.parentElement) ro.observe(ul.parentElement);
      this.resizeObservers.push(ro);
    }
    const fn = () => setTimeout(() => this.updateScrollIndicator(ul), 100);
    window.addEventListener('resize', fn);
    this.resizeListeners.push(fn);
    ul.addEventListener('scroll', () => this.updateScrollIndicator(ul));
  }

  private setupDragScroll(ul: HTMLElement): void {
    this.dragCleanups.push(this.createDragHandlers(ul));
  }

  private createDragHandlers(ul: HTMLElement): () => void {
    let isDown = false,
      startX = 0,
      scrollStart = 0,
      hasDragged = false;
    const down = (e: MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      isDown = true;
      hasDragged = false;
      startX = e.clientX;
      scrollStart = ul.scrollLeft;
      ul.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    };
    const move = (e: MouseEvent) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) hasDragged = true;
      ul.scrollLeft = scrollStart - dx;
    };
    const up = () => {
      if (!isDown) return;
      isDown = false;
      ul.style.cursor = '';
      document.body.style.userSelect = '';
    };
    const click = (e: MouseEvent) => {
      if (hasDragged) {
        e.stopPropagation();
        hasDragged = false;
      }
    };
    const drag = (e: DragEvent) => e.preventDefault();
    ul.addEventListener('mousedown', down);
    ul.addEventListener('dragstart', drag);
    ul.addEventListener('click', click, true);
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    return () => {
      ul.removeEventListener('mousedown', down);
      ul.removeEventListener('dragstart', drag);
      ul.removeEventListener('click', click, true);
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
  }

  private updateScrollIndicator(container: HTMLElement): void {
    const wrapper = container.closest('.scroll-wrapper');
    if (!wrapper) return;
    const hasRight =
      Math.ceil(container.scrollLeft) + container.clientWidth <
      container.scrollWidth - 1;
    wrapper.classList.toggle('has-overflow-right', hasRight);
    wrapper.classList.toggle('has-overflow-left', container.scrollLeft > 1);
  }

  // ── Category scroll focus ─────────────────────────────────────────

  private initCategoryFocus(): void {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>('.list_section .video_list'),
    );
    if (!sections.length) return;
    const listSection = document.querySelector<HTMLElement>('.list_section');

    const visible = new Set<HTMLElement>();

    const pick = () => {
      // Newest is always fallback; last visible section in DOM order wins
      let best: HTMLElement = sections[0];
      for (const s of sections) {
        if (visible.has(s)) best = s;
      }
      sections.forEach((s) =>
        s.classList.toggle('category-in-focus', s === best),
      );
      listSection?.classList.toggle('has-focused-category', true);
    };

    // rootMargin -25% on bottom: section only intersects once its top crosses that line
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) visible.add(e.target as HTMLElement);
          else visible.delete(e.target as HTMLElement);
        });
        pick();
      },
      { rootMargin: '0px 0px -25% 0px', threshold: 0 },
    );

    sections.forEach((s) => observer.observe(s));
    this.focusCleanups.push(() => observer.disconnect());
  }

  // ── HLS factory ──────────────────────────────────────────────────

  private createHlsInstance(): Hls {
    return new Hls({
      xhrSetup: (xhr: XMLHttpRequest) => {
        xhr.withCredentials = true;
      },
      ...environment.hls,
    });
  }
}
