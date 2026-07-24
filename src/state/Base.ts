export interface StateBaseProps<T extends object> {
  key: string;
  data: T;

  onUpdateData: <K extends keyof T>(key: K) => void;
  onRenderData: <K extends keyof T>(key: K, value: T[K]) => string;

  onGet: <K extends keyof T>(key: K) => T[K];
  onSet: <K extends keyof T>(key: K, value: T[K]) => void;

  onRender: () => void;
}

export class StateBase<
  T extends object = Record<string, never>,
> implements StateBaseProps<T> {
  key = "";
  data = {} as T;

  constructor(key: string, defaulValue?: T) {
    this.key = key;
    this.data = defaulValue ?? ({} as T);
  }

  onRenderData<K extends keyof T>(key: K, value: T[K]) {
    return `${value}`;
  }

  onUpdateData<K extends keyof T>(key: K) {
    const element = document.getElementById(`${this.key}-${String(key)}`);
    const value = this.data[key];

    if (element && value !== undefined && value !== null) {
      element.innerHTML = this.onRenderData(key, value);
    }
  }

  onGet<K extends keyof T>(key: K): T[K] {
    return this.data[key];
  }

  onSet<K extends keyof T>(key: K, value: T[K]) {
    this.data[key] = value;
  }

  onRender(){
    Object.keys(this.data).forEach(key=>{
      this.onUpdateData(key as keyof T)
    })
  }
}
