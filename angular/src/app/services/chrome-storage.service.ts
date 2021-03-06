import { Injectable } from '@angular/core';

@Injectable()
export class ChromeStorageService {

  private chrome = window['chrome'];

  constructor() { }

  public save(key, value) {
    this.chrome.storage.local.set({[key]: value}, () => { });
  }

  public load(key) {
    this.chrome.storage.local.get(key, (res) => { });
  }

  public remove(key) {
    this.chrome.storage.local.remove(key, () => { });
  }

  public clear() {
    this.chrome.storage.local.clear(() => { });
  }
}
