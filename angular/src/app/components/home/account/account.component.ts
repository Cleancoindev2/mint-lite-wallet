import {ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {StorageData} from "../../../interfaces/storage-data";
import {Wallet} from "../../../interfaces/wallet";
import {CommonService} from "../../../services/common.service";
import {ApiService} from "../../../services/api.service";
import {combineLatest} from "rxjs/internal/operators";
import {TransactionList} from "../../../interfaces/transaction-list";
import {environment} from "../../../../environments/environment";
import {Subscription} from "rxjs/index";
import {ChromeStorageService} from "../../../services/chrome-storage.service";
import {MessageBoxService} from "../../../services/message-box.service";
import {Transaction} from "../../../models/transaction";

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss']
})
export class AccountComponent implements OnInit, OnDestroy {

  public detailsLink: string = environment.detailsTxInfoLink;
  public webWalletLink = environment.webWallet;
  public storageData: StorageData;
  public currentWallet: Wallet;
  public balance = {
    mnt: 0,
    gold: 0
  };
  public isDataLoaded: boolean = false;
  public loading: boolean = false;
  public transactionList/*: TransactionList[]*/ = [];
  public isEditing: boolean = false;
  public accountName: string;

  private chrome = window['chrome'];
  private sub1: Subscription;
  private interval = null;

  constructor(
    private ref: ChangeDetectorRef,
    private commonService: CommonService,
    private apiService: ApiService,
    private chromeStorage: ChromeStorageService,
    private messageBox: MessageBoxService
  ) { }

  ngOnInit() {
    this.getStorageData(true);

    this.sub1 = this.commonService.chooseAccount$.subscribe((res: boolean) => {
      clearInterval(this.interval);
      this.interval = null;

      this.getStorageData(res);
      this.isEditing = false;
      this.ref.detectChanges();
    });
  }

  setUpdateDataInterval(publicKey: string) {
    this.interval = setInterval(() => {
      this.getStorageData(true);
    }, 15000);
  }

  // getBalanceAndTx(publicKey: string) {
  //   this.loading = true;
  //   const combined = this.apiService.getTransactionList(publicKey).pipe(combineLatest(
  //     this.apiService.getWalletBalance(publicKey)
  //   ));
  //   combined.subscribe((data: any) => {
  //     clearInterval(this.interval);
  //     this.transactionList = (data[0].res).slice(0, 4);
  //
  //     this.balance.mnt = data[1].res.balance.mint;
  //     this.balance.gold = data[1].res.balance.gold;
  //
  //     this.setUpdateDataInterval(publicKey);
  //
  //     this.isDataLoaded = true;
  //     this.loading = false;
  //     this.ref.detectChanges();
  //   }, () => {
  //     this.messageBox.alert('Service is temporary unavailable');
  //     this.ref.detectChanges();
  //   });
  // }

  getBalanceAndTx(publicKey: string) {
    this.interval === null && (this.loading = true);
    let txCount = this.currentWallet.tx ? 3 : 4;

    const combined = this.apiService.getTxByAddress(publicKey, 0, txCount, "date").pipe(combineLatest(
      this.apiService.getWalletBalance(publicKey)
    ));
    combined.subscribe((data: any) => {
      clearInterval(this.interval);
      this.transactionList = data[0]['data'].items;

      if (this.currentWallet.tx) {
        let tx = this.currentWallet.tx;
        this.transactionList.unshift(new Transaction());
        this.transactionList[0].tokensCount = tx.amount;
        this.transactionList[0].uniqueId = tx.hash;
        this.transactionList[0].sourceWallet = this.currentWallet.publicKey;
        this.transactionList[0].tokenType = tx.token === 'GOLD' ? 'commodity' : 'utility';
      }

      this.balance.mnt = data[1].res.balance.mint;
      this.balance.gold = data[1].res.balance.gold;

      this.setUpdateDataInterval(publicKey);

      this.isDataLoaded = true;
      this.loading = false;
      this.ref.detectChanges();
    }, () => {
      this.messageBox.alert('Service is temporary unavailable');
      this.ref.detectChanges();
    });
  }

  getStorageData(loadBalance: boolean) {
    this.chrome.storage.local.get(null, (result) => {
      this.storageData = result;
      this.currentWallet = this.storageData.wallets[this.storageData.currentWallet];
      loadBalance && this.getBalanceAndTx(this.currentWallet.publicKey);
      this.ref.detectChanges();
    });
  }

  copyText(val: string){
    this.commonService.copyText(val);
  }

  openInTab() {
    this.chrome.tabs.create({'url': this.chrome.extension.getURL('index.html')}, () => {});
  }

  editAccountName() {
    this.accountName = this.currentWallet.name;
    this.isEditing = true;
  }

  saveAccountName() {
    if (this.accountName.trim() == "") {
      return;
    }
    let wallets = this.storageData.wallets;
    wallets[this.storageData.currentWallet].name = this.accountName.trim();

    this.chromeStorage.save('wallets', wallets);
    this.commonService.chooseAccount$.next(false);
  }

  ngOnDestroy() {
    this.sub1 && this.sub1.unsubscribe();
    clearInterval(this.interval);
  }
}
