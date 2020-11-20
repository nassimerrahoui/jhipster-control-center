import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Vue2Filters from 'vue2-filters';
import CachesService, { Cache } from './caches.service';
import { Component, Inject } from 'vue-property-decorator';
import AbstractComponent from '@/applications/abstract.component';
import RoutesSelectorVue from '@/shared/routes/routes-selector.vue';
import RoutesService, { Route } from '@/shared/routes/routes.service';

@Component({
  components: {
    'routes-selector': RoutesSelectorVue,
  },
  mixins: [Vue2Filters.mixin],
})
export default class JhiCaches extends AbstractComponent {
  public caches: Cache[] = [];
  public filtered = '';
  public orderProp = 'name';
  public reverse = false;
  public activeRoute: Route;
  public routes: Route[];
  private unsubscribe$ = new Subject();
  @Inject('cachesService') private cachesService: () => CachesService;
  @Inject('routesService') private routesService: () => RoutesService;

  public mounted(): void {
    this.routesService()
      .routeChanged$.pipe(takeUntil(this.unsubscribe$))
      .subscribe(route => {
        this.activeRoute = route;
        this.refreshActiveRouteCaches();
      });

    this.routesService()
      .routesChanged$.pipe(takeUntil(this.unsubscribe$))
      .subscribe(routes => (this.routes = routes));
  }

  public refreshActiveRouteCaches(): void {
    this.cachesService()
      .findAll(this.activeRoute)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(
        res => {
          this.caches = res;
          this.resetError();
        },
        error => (this.error = error)
      );
  }

  public changeOrder(orderProp): void {
    this.orderProp = orderProp;
    this.reverse = !this.reverse;
  }

  public confirmEviction(cacheName: String, cacheManager: String): void {
    const config = {
      title: 'Please Confirm',
      size: 'md',
      buttonSize: 'md',
      okVariant: 'danger',
      okTitle: 'YES',
      cancelTitle: 'NO',
      bodyClass: 'text-center',
      footerClass: 'p-2',
      hideHeaderClose: false,
      centered: true,
    };
    const message = `Are you sure you want to evict ${cacheManager} : ${cacheName} ?`;
    this.$bvModal
      .msgBoxConfirm(message, config)
      .then(res => {
        if (res) {
          this.evict(cacheName, cacheManager);
        }
      })
      .catch(error => console.warn(error));
  }

  public evict(cacheName: String, cacheManager: String): void {
    this.cachesService()
      .evictSelectedCache(this.activeRoute, cacheName, cacheManager)
      .then(() => {
        return this.$bvToast.toast(`${cacheManager} : ${cacheName} evicted`, {
          title: 'Success',
          variant: 'success',
          solid: true,
          autoHideDelay: 5000,
        });
      })
      .catch(error => {
        return this.$bvToast.toast(`${error}`, {
          title: `Error`,
          variant: 'danger',
          solid: true,
          autoHideDelay: 5000,
        });
      });
  }

  /* istanbul ignore next */
  beforeDestroy(): void {
    // prevent memory leak when component destroyed
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
}