import { Component, Vue, Inject } from 'vue-property-decorator';
import Vue2Filters from 'vue2-filters';
import RoutesSelectorVue from '@/shared/routes/routes-selector.vue';
import RoutesService, { Route } from '@/shared/routes/routes.service';
import { RefreshService } from '@/shared/refresh/refresh.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import LogfileService from './logfile.service';
import RefreshSelectorVue from '@/shared/refresh/refresh-selector.mixin.vue';

@Component({
  components: {
    'routes-selector': RoutesSelectorVue,
    'refresh-selector': RefreshSelectorVue,
  },
  mixins: [Vue2Filters.mixin],
})
export default class JhiLogfile extends Vue {
  public logtxt = '';

  public filtered = '';
  public orderProp = 'name';
  public reverse = false;

  activeRoute: Route;
  routes: Route[];
  unsubscribe$ = new Subject();

  @Inject('logfileService') private logfileService: () => LogfileService;
  @Inject('routesService') private routesService: () => RoutesService;

  /* istanbul ignore next */
  public mounted(): void {
    this.routesService()
      .routeChanged$.pipe(takeUntil(this.unsubscribe$))
      .subscribe(route => {
        this.activeRoute = route;
        this.displayActiveRouteLog();
      });

    this.routesService()
      .routesChanged$.pipe(takeUntil(this.unsubscribe$))
      .subscribe(routes => (this.routes = routes));
  }

  displayActiveRouteLog(): void {
    if (this.activeRoute) {
      this.logfileService()
        .find(this.activeRoute)
        .pipe(takeUntil(this.unsubscribe$))
        .subscribe(
          logtxt => {
            this.logtxt = logtxt;
          },
          error => {
            if (error.status === 503 || error.status === 500 || error.status === 404) {
              this.logtxt =
                'No available logfile. Please note that it is not available by default, you need to set up the Spring Boot properties below! \n' +
                'Please check:\n ' +
                '- if the microservice is up\n ' +
                '- if these properties are set: \n ' +
                '    - logging.file.path\n ' +
                '    - logging.file.name (to avoid using the same spring.log)\n\n' +
                'See:\n ' +
                '- https://docs.spring.io/spring-boot/docs/current/reference/html/production-ready-endpoints.html\n ' +
                '- https://docs.spring.io/spring-boot/docs/current/reference/html/howto-logging.html';
            }
          }
        );
    }
  }

  searchByAppName(): Route[] {
    return this.routes!.filter(route => route.serviceId === this.activeRoute!.serviceId);
  }

  scrollToBottom(): void {
    this.$el.querySelector('#logfile').scrollTop = this.$el.querySelector('#logfile').scrollHeight;
  }

  scrollToTop(): void {
    this.$el.querySelector('#logfile').scrollTop = 0;
  }

  /* istanbul ignore next */
  beforeDestroy(): void {
    // prevent memory leak when component destroyed
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
}