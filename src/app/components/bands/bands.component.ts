import { Component, ElementRef, OnInit, Renderer2, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { PageEvent } from '@angular/material';
import { Subject } from 'rxjs/Subject';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';
import { forkJoin } from 'rxjs/observable/forkJoin';

import { BandsService } from './shared/service/bands.service';

import { AboutBand } from '../about/shared/model/aboutBand.model';
import { Member } from '../members/shared/model/member.model';

import * as fromApp from '../../shared/store/app.reducers';
import * as fromBands from './shared/store/bands.reducers';
import * as BandsActions from './shared/store/bands.actions';
import * as OverlayActions from '../../shared/overlay/shared/store/overlay.actions';

@Component({
  selector: 'app-bands',
  templateUrl: './bands.component.html',
  styleUrls: ['./bands.component.css']
})
export class BandsComponent implements OnInit {

  @ViewChild('inputComment') inputComment;
  @ViewChild('genresComment') genresComment;
  @ViewChild('pagin') pagin;
  @ViewChild('container') container: ElementRef;

  band = '';

  genreGroups = [];
  keyUp = new Subject<any>();
  notExist = '';

  // pagination
  pageSize;

  // Counters
  countFrom: number;
  countTo: number;

  bandsState: Observable<fromBands.State>;

  constructor(
    private bandsService: BandsService,
    private store: Store<fromApp.AppState>,
    private router: Router,
    private render: Renderer2
  ) {
    this.keyUp
      .map(event => event)
      .debounceTime(250)
      .distinctUntilChanged()
      .subscribe(val => {
        this.store.dispatch(new BandsActions.SearchGenre(''));
        if (val.target.value.trim() === '') {
          this.notExist = '';
          this.store.dispatch(new BandsActions.GetBands([]));
          this.store.dispatch(new BandsActions.GetBandId(null));
          this.store.dispatch(new BandsActions.SearchInput(''));
          return;
        } else {
          this.store.dispatch(new BandsActions.SearchInput(val.target.value));
          this.bandsService.getBands(val.target.value.trim())
            .subscribe(bands => {
              bands.length ? this.notExist = '' : this.notExist = `No data for '${val.target.value.trim()}' band`;
              this.store.dispatch(new BandsActions.GetBands(bands));
              this.countFrom = 0;
              this.countTo = 10;
            });
        }
      });
  }

  ngOnInit() {
    this.bandsService.getAllGenres()
      .subscribe(genres => this.genreGroups = genres);
    this.bandsState = this.store.select('bands');
    this.countFrom = 0;
    this.countTo = 10;
    const comments = [
      {
        top: this.genresComment._elementRef.nativeElement.getBoundingClientRect().top + 75,
        left: this.genresComment._elementRef.nativeElement.getBoundingClientRect().left - 35
      },
      {
        top: this.inputComment._elementRef.nativeElement.getBoundingClientRect().top - 40,
        left: this.inputComment._elementRef.nativeElement.getBoundingClientRect().left - 35
      }
    ];
    this.store.dispatch(new OverlayActions.SetComments({name: 'bands', comments: comments}));
  }

  onClickBand(bandId: number) {
    const band = this.bandsService.getBand(bandId);
    const member = this.bandsService.getMembers(bandId);
    const gallery = this.bandsService.getGallery(bandId);
    forkJoin([band, member, gallery])
      .subscribe((res: [AboutBand[], Member[]]) => {
        this.render.addClass(this.container.nativeElement, 'containerAnime');
        this.store.dispatch(new BandsActions.MultyTwo([
          new BandsActions.GetBandId(bandId),
          new BandsActions.GetBand(res[0]),
          new BandsActions.GetMembers(res[1]),
          new BandsActions.GetGallery(res[2])
        ]));
        setTimeout(() => this.router.navigate(['about']), 500);
      });
  }

  onChangeGenre(event) {
    this.store.dispatch(new BandsActions.SearchInput(''));
    if (event.source.value === undefined) {
      this.notExist = '';
      this.store.dispatch(new BandsActions.MultyOne([
        new BandsActions.GetBands([]),
        new BandsActions.GetBandId(null),
        new BandsActions.SearchGenre('')
      ]));
      return;
    } else {
      this.store.dispatch(new BandsActions.SearchGenre(event.source.value));
      this.bandsService.getByGenre(event.source.value.name)
        .subscribe(bands => {
          if (Object.keys(bands).length === 0) {
            this.notExist = `No data from ${event.source.value.name} genre`;
            this.store.dispatch(new BandsActions.Multy([
              new BandsActions.GetBands([]),
              new BandsActions.GetBandId(null)
            ]));
          }
          this.store.dispatch(new BandsActions.GetBands(bands));
          this.countFrom = 0;
          this.countTo = 10;
        });
    }
  }

  // pagination
  onChangePage(pageEvent: PageEvent) {
    pageEvent.length = Math.max(pageEvent.length, 0);
    this.countFrom = pageEvent.pageIndex * pageEvent.pageSize;
    this.countTo = this.countFrom < pageEvent.length ?
      Math.min(this.countFrom + pageEvent.pageSize, pageEvent.length) :
      this.countFrom + pageEvent.pageSize;
  }

}
