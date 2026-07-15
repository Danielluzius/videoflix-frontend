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
  overlayDescription = '';
  currentThumbnailUrl = '';
  thumbnailVisible = true;
  previewVideoReady = false;
  titleFading = false;
  previewVisible = true;

  private hls: Hls | null = null;
  private overlayHls: Hls | null = null;
  private plyr: Plyr | null = null;
  private previewEndedListener: (() => void) | null = null;
  private previewTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly PREVIEW_DURATION_MS = 16_000;
  private autoAdvanceStopped = false;

  private resizeObservers: ResizeObserver[] = [];
  private resizeListeners: Array<() => void> = [];
  private dragCleanups: Array<() => void> = [];
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
  }

  private loadVideos(): void {
    this.videoService.getVideos().subscribe({
      next: (response) => {
        if (!response.ok) {
          this.loadError = true;
          this.toast.showToastMessage(true, ['Failed to load videos']);
          return;
        }
        this.videos = response.data as Video[];
        this.newestVideos = this.videoService.getNewestVideos(this.videos);

        const catSet = new Set(
          this.videos.map((v) => v.category.toLowerCase()),
        );
        this.categories = [...catSet].filter((c) => c !== 'newest');

        if (this.videos.length > 0) {
          this.videoTitle = this.videos[0].title;
          this.videoDescription = this.videos[0].description;
          this.currentVideo = this.videos[0].id;
          this.currentThumbnailUrl = this.videos[0].thumbnail_url;
          setTimeout(() => {
            this.loadVideo(this.videos[0].id, '480p');
            this.initScrollIndicators();
          }, 0);
          setTimeout(() => this.initScrollIndicators(), 100);
        }
      },
      error: () => {
        this.loadError = true;
        this.toast.showToastMessage(true, ['Failed to load videos']);
      },
    });
  }

  getVideosForCategory(cat: string): Video[] {
    return this.videos.filter((v) => v.category.toLowerCase() === cat);
  }

  showVideo(id: number): void {
    this.autoAdvanceStopped = true;
    this.currentVideo = id;
    // Fade out preview, pause video after fade completes
    this.previewVisible = false;
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
      this.previewTimer = null;
    }
    setTimeout(() => {
      this.videoPlayerRef?.nativeElement?.pause();
    }, 500);
    this.openVideoOverlay(id, false);
  }

  // Used for the Newest carousel: show the video in the preview section
  // without opening the player overlay. The user can then press Play.
  previewVideo(id: number): void {
    this.autoAdvanceStopped = true;
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
      this.previewTimer = null;
    }
    const video = this.videos.find((v) => v.id === id);
    if (!video) return;
    this.currentVideo = id;
    this.currentThumbnailUrl = video.thumbnail_url;
    this.thumbnailVisible = true;
    this.videoTitle = video.title;
    this.videoDescription = video.description;
    this.previewVisible = true;
    this.loadVideo(id, '480p');
  }

  playVideo(id?: number): void {
    const targetId = id ?? this.currentVideo;
    if (targetId == null) return;
    this.openVideoOverlay(targetId);
  }

  // ── Preview Player ───────────────────────────────────────────────

  private loadVideo(id: number, resolution: string): void {
    const videoEl = this.videoPlayerRef?.nativeElement;
    if (!videoEl) return;

    if (this.previewEndedListener) {
      videoEl.removeEventListener('ended', this.previewEndedListener);
      this.previewEndedListener = null;
    }
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
      this.previewTimer = null;
    }
    this.hls?.destroy();
    this.hls = null;

    // Hide video — thumbnail shows until canplay fires
    this.previewVideoReady = false;

    // Show video as soon as browser has enough data (even before actually playing)
    videoEl.addEventListener(
      'canplay',
      () => {
        this.previewVideoReady = true;
      },
      { once: true },
    );

    // Start the auto-advance timer once actually playing
    const startTimer = () => {
      videoEl.removeEventListener('playing', startTimer);
      if (this.autoAdvanceStopped) return;
      if (this.previewTimer) clearTimeout(this.previewTimer);
      this.previewTimer = setTimeout(
        () => this.onPreviewEnded(),
        this.PREVIEW_DURATION_MS,
      );
    };
    videoEl.addEventListener('playing', startTimer);

    this.previewEndedListener = () => this.onPreviewEnded();
    videoEl.addEventListener('ended', this.previewEndedListener);

    const previewUrl = this.videos.find((v) => v.id === id)?.preview_clip_url;

    if (previewUrl) {
      // MP4 preview clip — fast, no HLS overhead
      videoEl.muted = true;
      videoEl.src = previewUrl;
      videoEl.loop = true;
      videoEl.addEventListener(
        'loadedmetadata',
        () => {
          videoEl.playbackRate = 0.5;
        },
        { once: true },
      );
      videoEl.load();
      videoEl.play().catch(() => {});
    } else {
      // Fallback: HLS (video has no preview clip yet)
      this.hls = this.createHlsInstance();
      this.hls.loadSource(this.videoService.getHlsUrl(id));
      this.hls.attachMedia(videoEl);
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoEl.loop = true;
        videoEl.addEventListener(
          'loadedmetadata',
          () => {
            videoEl.playbackRate = 0.5;
          },
          { once: true },
        );
        videoEl.play().catch(() => {});
      });
      this.hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) console.error('HLS fatal error:', data);
      });
    }
  }

  private onPreviewEnded(): void {
    if (this.titleFading || this.autoAdvanceStopped) return;
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
      this.previewTimer = null;
    }
    const idx = this.newestVideos.findIndex((v) => v.id === this.currentVideo);
    if (idx === -1) return;

    const nextIdx = (idx + 1) % this.newestVideos.length;
    const nextVideo = this.newestVideos[nextIdx];

    this.titleFading = true;
    this.previewVideoReady = false;
    this.thumbnailVisible = false;

    // Swap title and thumbnail after fade-out, then load new video
    setTimeout(() => {
      this.videoTitle = nextVideo.title;
      this.videoDescription = nextVideo.description;
      this.currentVideo = nextVideo.id;
      this.currentThumbnailUrl = nextVideo.thumbnail_url;
      this.thumbnailVisible = true;
      this.loadVideo(nextVideo.id, '480p');

      // Scroll the newly active thumbnail into view — only horizontal,
      // never touch the page's vertical scroll position.
      setTimeout(() => {
        const newestUl = document.getElementById(
          'newest',
        ) as HTMLElement | null;
        const items = newestUl?.querySelectorAll('li');
        if (newestUl && items && items[nextIdx]) {
          const li = items[nextIdx] as HTMLElement;
          const targetScrollLeft =
            li.offsetLeft - newestUl.clientWidth / 2 + li.offsetWidth / 2;
          newestUl.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
        }
        if (newestUl) this.updateScrollIndicator(newestUl);
      }, 50);

      setTimeout(() => {
        this.titleFading = false;
      }, 50);
    }, 500);
  }

  // ── Overlay ──────────────────────────────────────────────────────

  openVideoOverlay(videoId: number, autoPlay = true): void {
    const video = this.videos.find((v) => v.id === videoId);
    if (!video) return;

    this.overlayOpen = true;
    this.overlayTitle = video.title;
    this.overlayDescription = video.description;
    document.body.classList.add('overlay-open');
    document.body.style.overflow = 'hidden';
    this.hideHeader();

    setTimeout(() => {
      this.loadVideoInOverlay(videoId, autoPlay);
    }, 0);
  }

  closeVideoOverlay(): void {
    // Destroy players BEFORE setting overlayOpen = false so Angular does not
    // remove the video element from the DOM while HLS / Plyr still reference it.
    if (this.overlayHls) {
      this.overlayHls.destroy();
      this.overlayHls = null;
    }
    if (this.plyr) {
      this.plyr.destroy();
      this.plyr = null;
    }

    // Setting this to false triggers @if(overlayOpen) to destroy the <video>
    // element. A fresh element is created on the next open, avoiding any stale
    // Plyr / HLS state that would prevent re-initialisation.
    this.overlayOpen = false;
    document.body.classList.remove('overlay-open');
    document.body.style.overflow = 'auto';
    this.showHeader();

    // Resume preview and restart carousel auto-advance
    this.autoAdvanceStopped = false;
    this.thumbnailVisible = true;
    this.previewVisible = true;
    const previewEl = this.videoPlayerRef?.nativeElement;
    if (previewEl) {
      previewEl.play().catch(() => {});
      if (this.previewTimer) clearTimeout(this.previewTimer);
      this.previewTimer = setTimeout(
        () => this.onPreviewEnded(),
        this.PREVIEW_DURATION_MS,
      );
    }
  }

  // Tap auf den Rotate-Hinweis: im Querformat Fullscreen starten
  onRotateHintTap(event: Event): void {
    event.stopPropagation();
    if (window.matchMedia('(orientation: landscape)').matches) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.plyr as any)?.fullscreen?.enter();
    }
  }

  private loadVideoInOverlay(id: number, autoPlay = true): void {
    // Use getElementById instead of @ViewChild to always get the live DOM node,
    // even if Plyr has moved the element inside its wrapper during a previous session.
    const overlayEl = document.getElementById(
      'overlayVideo',
    ) as HTMLVideoElement | null;
    if (!overlayEl) return;

    if (this.plyr) {
      this.plyr.destroy();
      this.plyr = null;
    }
    if (this.overlayHls) {
      this.overlayHls.destroy();
      this.overlayHls = null;
    }

    // Fully reset the media element before HLS attaches via MediaSource Extensions.
    // Setting src='' would cause a failed network load; removeAttribute+load() resets
    // to NETWORK_EMPTY / HAVE_NOTHING which is what HLS.js requires.
    overlayEl.removeAttribute('src');
    overlayEl.load();

    this.overlayHls = this.createHlsInstance();
    const url = this.videoService.getHlsUrl(id);
    this.overlayHls.loadSource(url);
    this.overlayHls.attachMedia(overlayEl);

    this.overlayHls.on(Hls.Events.MANIFEST_PARSED, () => {
      const hls = this.overlayHls!;
      // Heights descending (1080, 720, 480) + 0 for Auto
      const heights = hls.levels.map((l) => l.height).reverse();
      heights.push(0);

      this.plyr = new Plyr(overlayEl, {
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
        quality: {
          default: 0,
          options: heights,
          forced: true,
          onChange: (newQuality: number) => {
            if (newQuality === 0) {
              hls.currentLevel = -1;
            } else {
              const idx = hls.levels.findIndex((l) => l.height === newQuality);
              if (idx !== -1) hls.currentLevel = idx;
            }
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        i18n: { qualityLabel: { 0: 'Auto' } } as any,
      });

      // Inject top bar and info-overlay into the Plyr container.
      // setTimeout 0 ensures Plyr has created its .plyr wrapper in the DOM.
      setTimeout(() => {
        const plyrEl = overlayEl.closest('.plyr') as HTMLElement | null;
        if (plyrEl && !plyrEl.querySelector('.overlay-top-bar')) {
          // ── Top bar: zentrierter Titel + X-Button rechts ──────────
          const topBar = document.createElement('div');
          topBar.className = 'overlay-top-bar';

          const titleEl = document.createElement('span');
          titleEl.className = 'overlay-top-title';
          titleEl.textContent = this.overlayTitle;

          const closeBtn = document.createElement('button');
          closeBtn.className = 'plyr__control overlay-close-btn';
          closeBtn.setAttribute('aria-label', 'Schließen');
          closeBtn.setAttribute('type', 'button');
          closeBtn.innerHTML =
            '<svg aria-hidden="true" focusable="false" viewBox="0 0 18 18">' +
            '<path d="M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9' +
            'l-4.47 4.47 1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z"' +
            ' fill="currentColor"/></svg>';
          closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeVideoOverlay();
          });

          topBar.appendChild(titleEl);
          topBar.appendChild(closeBtn);
          plyrEl.appendChild(topBar);

          // ── Info-Overlay: Titel + Beschreibung (mitte links) ──────
          const infoOverlay = document.createElement('div');
          infoOverlay.className = 'overlay-info';

          const infoTitle = document.createElement('span');
          infoTitle.className = 'overlay-info-title';
          infoTitle.textContent = this.overlayTitle;

          const infoDesc = document.createElement('span');
          infoDesc.className = 'overlay-info-description';
          infoDesc.textContent = this.overlayDescription;

          infoOverlay.appendChild(infoTitle);
          if (this.overlayDescription) infoOverlay.appendChild(infoDesc);
          plyrEl.appendChild(infoOverlay);

          // Click on video area (not on controls/custom elements) → play/pause
          const videoWrapper = plyrEl.querySelector<HTMLElement>(
            '.plyr__video-wrapper',
          );
          if (videoWrapper) {
            videoWrapper.addEventListener('click', (e) => {
              e.stopPropagation();
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (this.plyr as any)?.togglePlay?.();
            });
          }
        }
      }, 0);

      if (autoPlay) {
        setTimeout(() => {
          this.plyr?.play();
        }, 2000);
      }
    });

    this.overlayHls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) console.error('HLS overlay fatal error:', data);
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.overlayOpen) {
      this.closeVideoOverlay();
    }
  }

  // ── Header hide/show ─────────────────────────────────────────────

  private hideHeader(): void {
    const header = document.querySelector('.main_header') as HTMLElement;
    if (header) {
      header.style.transform = 'translateY(-100%)';
      header.style.opacity = '0';
      header.style.transition =
        'transform 0.3s ease-in-out, opacity 0.3s ease-in-out';
    }
  }

  private showHeader(): void {
    const header = document.querySelector('.main_header') as HTMLElement;
    if (header) {
      header.style.transform = 'translateY(0)';
      header.style.opacity = '1';
      header.style.transition =
        'transform 0.3s ease-in-out, opacity 0.3s ease-in-out';
    }
  }

  // ── Scroll indicators ────────────────────────────────────────────

  private initScrollIndicators(): void {
    const lists = document.querySelectorAll('.video_list ul');
    lists.forEach((list) => {
      const ul = list as HTMLElement;
      if (this.initializedLists.has(ul)) return;
      this.initializedLists.add(ul);
      this.updateScrollIndicator(ul);

      if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => this.updateScrollIndicator(ul));
        ro.observe(ul);
        if (ul.parentElement) ro.observe(ul.parentElement);
        this.resizeObservers.push(ro);
      }

      const resizeFn = (): void => {
        setTimeout(() => this.updateScrollIndicator(ul), 100);
      };
      window.addEventListener('resize', resizeFn);
      this.resizeListeners.push(resizeFn);

      ul.addEventListener('scroll', () => this.updateScrollIndicator(ul));

      // ── Mouse drag-to-scroll (desktop) ──────────────────────────
      let isDown = false;
      let startX = 0;
      let scrollStart = 0;
      let hasDragged = false;

      const onMouseDown = (e: MouseEvent) => {
        // Only react to left mouse button
        if (e.button !== 0) return;
        e.preventDefault(); // prevent native image drag
        isDown = true;
        hasDragged = false;
        startX = e.clientX;
        scrollStart = ul.scrollLeft;
        ul.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
      };

      // Listen on document so dragging outside the ul still works
      const onDocMouseMove = (e: MouseEvent) => {
        if (!isDown) return;
        const dx = e.clientX - startX;
        if (Math.abs(dx) > 4) hasDragged = true;
        ul.scrollLeft = scrollStart - dx;
      };

      const onDocMouseUp = () => {
        if (!isDown) return;
        isDown = false;
        ul.style.cursor = '';
        document.body.style.userSelect = '';
      };

      // Suppress click on child elements when the user was dragging
      const onClickCapture = (e: MouseEvent) => {
        if (hasDragged) {
          e.stopPropagation();
          hasDragged = false;
        }
      };

      // Prevent browser native image/text drag from hijacking mousemove
      const onDragStart = (e: DragEvent) => e.preventDefault();

      ul.addEventListener('mousedown', onMouseDown);
      ul.addEventListener('dragstart', onDragStart);
      ul.addEventListener('click', onClickCapture, true);
      document.addEventListener('mousemove', onDocMouseMove);
      document.addEventListener('mouseup', onDocMouseUp);

      this.dragCleanups.push(() => {
        ul.removeEventListener('mousedown', onMouseDown);
        ul.removeEventListener('dragstart', onDragStart);
        ul.removeEventListener('click', onClickCapture, true);
        document.removeEventListener('mousemove', onDocMouseMove);
        document.removeEventListener('mouseup', onDocMouseUp);
      });
    });
  }

  private updateScrollIndicator(container: HTMLElement): void {
    const scrollWrapper = container.closest('.scroll-wrapper');
    if (!scrollWrapper) return;
    const hasRight =
      Math.ceil(container.scrollLeft) + container.clientWidth <
      container.scrollWidth - 1;
    const hasLeft = container.scrollLeft > 1;
    scrollWrapper.classList.toggle('has-overflow-right', hasRight);
    scrollWrapper.classList.toggle('has-overflow-left', hasLeft);
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
