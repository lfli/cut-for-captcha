<template>
  <div>
    <div class="header">
      <input
        type="file"
        multiple="multiple"
        accept="image/png,image/jpg,image/avif"
        @change="fileChange($event)"
      />
      <span @mouseover="showSelector()" class="size-handle">
        <b>({{ currentX }}×{{ currentY }})</b>调整切割尺寸
      </span>
      <div
        v-show="state.isShowSizeSelector"
        @mouseleave="hideSelector()"
        class="size-selector"
      >
        <div
          v-for="index of 100"
          :key="index"
          :class="[
            'size-selector-item',
            isSelectedItem(index) ? 'selected-item' : '',
          ]"
          @mouseover="itemOver(index)"
          @click="saveSize()"
        ></div>
      </div>
    </div>
    <div class="content">
      <div style="flex: 1">
        <div
          v-for="(file, index) in state.fileList"
          :key="index"
          :class="['file-item', file === state.file ? 'selected-item' : '']"
          @click="switchFile(file)"
        >
          {{ file.name }}
        </div>
      </div>
      <div style="flex: 1">
        <div>
          <img ref="cover" src="" alt="" />
        </div>
        <div v-if="state.file">点击选择包含寻找物的块 (下图中)</div>
        <div
          ref="cutBox"
          class="cut-box"
          :style="{ width: state.cutBoxWidth + 'px' }"
        ></div>
      </div>
      <div style="flex: 1"></div>
    </div>
    <div v-if="state.file" class="footer">
      <div>
        <span>请输入要寻找的物体名</span>
        <input type="text" placeholder="物体名" v-model="state.seekObjName" />
      </div>
      <button
        v-if="state.file"
        :disabled="disabledFinishBtn"
        class="finish-botton"
        @click="finish()"
      >
        完成
      </button>
    </div>
  </div>
</template>

<script lang="ts">
declare const window: Window & { fs: any; path: any; jsonfile: any };
import { reactive } from "@vue/reactivity";
import { Options, Vue } from "vue-class-component";
import { verifyString } from "../shared/utils";
const jsonfile = window.jsonfile;
const fs = window.fs;

@Options({
  name: "home",
  computed: {
    isSelectedItem() {
      return (index: number) => {
        let currentX = this.state.currentIndex % 10;
        currentX = currentX === 0 ? currentX + 10 : currentX;
        const currentY = Math.ceil(this.state.currentIndex / 10);

        let x = index % 10;
        x = x === 0 ? x + 10 : x;
        const y = Math.ceil(index / 10);

        if (x <= currentX && y <= currentY) {
          return true;
        }
        return false;
      };
    },
    currentX() {
      if (this.state.isShowSizeSelector) {
        if (this.state.currentIndex === 0) {
          return 0;
        }
        let currentX = this.state.currentIndex % 10;
        currentX = currentX === 0 ? currentX + 10 : currentX;
        return currentX;
      } else {
        return this.state.sizeWidth;
      }
    },
    currentY() {
      if (this.state.isShowSizeSelector) {
        const currentY = Math.ceil(this.state.currentIndex / 10);
        return currentY;
      } else {
        return this.state.sizeHeight;
      }
    },
    disabledFinishBtn() {
      return (
        !this.state.answerIndexList.length ||
        !verifyString(this.state.seekObjName)
      );
    },
  },
})
export default class Home extends Vue {
  $refs: {
    cover?: HTMLElement & { src: string | ArrayBuffer | null };
    cutBox?: HTMLDivElement;
  } = {};

  state = reactive<{
    sizeWidth: number; // size x
    sizeHeight: number; // size y
    saveIndex: number; // 所选中的 size 方块 index
    cutBoxWidth: number;
    isShowSizeSelector: boolean;
    currentIndex: number; // 当前鼠标所指的方块 index
    fileList: File[]; // 所选的图片列表
    file: File; // 当前所要切图的图片
    answerIndexList: number[]; // 寻找物所对应的块
    seekObjName: string; // 寻找的物体
  }>({
    sizeWidth: 3,
    sizeHeight: 3,
    saveIndex: 23,
    cutBoxWidth: 0,
    isShowSizeSelector: false,
    currentIndex: 0,
    fileList: [],
    file: null,
    answerIndexList: [],
    seekObjName: "",
  });

  switchFile(file: File) {
    this.hideSelector();
    this.state.file = file;
    this.generateCutPicListForImg(this.state.file);
  }

  fileChange(event: InputEvent & { target: { files: File[] } }) {
    if (!event || !event.target || !event.target.files) {
      return;
    }
    this.state.fileList = event.target.files;
    if (this.state.fileList.length > 0) {
      this.state.file = this.state.fileList[0];
      this.generateCutPicListForImg(this.state.file);
    }
  }

  private generateCutPicListForImg(file: File) {
    const fileReader = new FileReader();
    fileReader.readAsDataURL(file);
    fileReader.onload = () => {
      this.clearCutPic();
      this.state.answerIndexList.length = 0;

      if (this.$refs.cover) {
        this.$refs.cover.src = fileReader.result;
        setTimeout(() => {
          if (this.$refs.cover) {
            this.state.cutBoxWidth =
              this.$refs.cover.clientWidth + this.state.sizeWidth;
            const stepWidth =
              this.$refs.cover.clientWidth / this.state.sizeWidth;
            const stepHeight =
              this.$refs.cover.clientHeight / this.state.sizeHeight;

            for (let y = 0; y < this.state.sizeHeight; y++) {
              for (let x = 0; x < this.state.sizeWidth; x++) {
                this.cutPic(
                  this.$refs.cover,
                  x * stepWidth,
                  y * stepHeight,
                  stepWidth,
                  stepHeight,
                  this.state.sizeWidth * y + x
                );
              }
            }
          }
        }, 10);
      }
    };
  }

  private cutPic(
    img: any,
    sx: number,
    sy: number,
    sWidth: number,
    sHeight: number,
    index: number
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = sWidth;
    canvas.height = sHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(
      img,
      sx,
      sy,
      sWidth,
      sHeight,
      0,
      0,
      img.width / this.state.sizeWidth,
      img.height / this.state.sizeHeight
    );
    canvas.addEventListener("click", (_: Event) => {
      // 选中
      if (!this.state.answerIndexList.includes(index)) {
        this.state.answerIndexList.push(index);
      }
      const divElement = document.createElement("div");
      divElement.style.width = sWidth + "px";
      divElement.style.height = sHeight + "px";
      divElement.style.backgroundColor = "red";
      divElement.style.position = "absolute";
      divElement.style.opacity = "0.5";
      divElement.addEventListener("click", () => {
        // 移除选中
        const i = this.state.answerIndexList.indexOf(index);
        if (i > -1) {
          this.state.answerIndexList.splice(i, 1);
        }
        divElement.remove();
      });
      canvas.parentNode.insertBefore(divElement, canvas);
    });

    const divElement = document.createElement("div");
    divElement.style.marginBottom = "1px";
    divElement.style.marginRight = "1px";
    divElement.style.width = Math.floor(sWidth) + "px";
    divElement.style.height = Math.floor(sHeight) + "px";
    divElement.style.cursor = "pointer";
    divElement.appendChild(canvas);
    if (this.$refs.cutBox) {
      this.$refs.cutBox.appendChild(divElement);
    }
  }

  private clearCutPic() {
    if (this.$refs.cutBox) {
      while (this.$refs.cutBox.childNodes.length > 0) {
        this.$refs.cutBox.removeChild(this.$refs.cutBox.childNodes[0]);
      }
    }
  }

  showSelector() {
    this.state.currentIndex = this.state.saveIndex;
    this.state.isShowSizeSelector = true;
  }

  hideSelector() {
    this.state.isShowSizeSelector = false;
    this.state.currentIndex = 0;
  }

  itemOver(index: number) {
    this.state.currentIndex = index;
  }

  saveSize() {
    this.state.saveIndex = this.state.currentIndex;
    this.state.sizeWidth = this.methodCurrentX();
    this.state.sizeHeight = this.methodCurrentY();

    this.hideSelector();
    this.generateCutPicListForImg(this.state.file);
  }

  private methodCurrentX() {
    if (this.state.currentIndex === 0) {
      return 0;
    }
    let currentX = this.state.currentIndex % 10;
    currentX = currentX === 0 ? currentX + 10 : currentX;
    return currentX;
  }

  private methodCurrentY() {
    const currentY = Math.ceil(this.state.currentIndex / 10);
    return currentY;
  }

  finish() {
    const onlyName = this.state.seekObjName + "-" + Date.now();
    const dir = `./cut-pic/${this.state.seekObjName}/${onlyName}`;
    this.mkdir(dir).then(() => {
      const promiseList: Promise<void>[] = [];
      for (let i = 0; i < this.$refs.cutBox.childNodes.length; i++) {
        const node = this.$refs.cutBox.childNodes[i];
        const promise = this.saveCutPic(
          node.lastChild as HTMLCanvasElement,
          dir,
          this.state.seekObjName,
          i
        );
        promiseList.push(promise);
      }
      Promise.all(promiseList)
        .then(() => {
          this.saveJsonData(
            this.state.seekObjName,
            onlyName,
            this.$refs.cutBox.childNodes.length
          );
          alert("保存切图成功。");
        })
        .catch(() => {
          alert("保存切图失败。");
        });
    });
  }

  private saveJsonData(seekObjName: string, onlyName: string, length: number) {
    const mappable = `./cut-pic/mappable.json`;
    if (!this.isFileExist(mappable)) {
      const obj = {
        [seekObjName]: {
          name: seekObjName,
          list: [
            {
              id: onlyName,
              path: `./${seekObjName}/${onlyName}`,
              length,
              answer: this.state.answerIndexList,
            },
          ],
        },
      };
      jsonfile.writeFile(mappable, obj, function (err) {
        if (err) console.error(err);
      });
    } else {
      jsonfile
        .readFile(mappable)
        .then((obj) => {
          obj[seekObjName] = obj[seekObjName] || { name: seekObjName };
          obj[seekObjName].list = obj[seekObjName].list || [];
          obj[seekObjName].list.push({
            id: onlyName,
            path: `./${seekObjName}/${onlyName}`,
            length,
            answer: this.state.answerIndexList,
          });

          jsonfile.writeFile(mappable, obj, function (err) {
            if (err) console.error(err);
          });
        })
        .catch((error) => console.error(error));
    }
  }

  private mkdir(dirPath: string) {
    return new Promise<void>((resolve, reject) => {
      fs.mkdir(
        dirPath,
        { recursive: true },
        (data) => {
          console.log(data);
          resolve();
        },
        (err) => {
          alert("创建路径失败。");
          reject();
        }
      );
    });
  }

  private saveCutPic(
    canvas: HTMLCanvasElement,
    dir: string,
    name: string,
    index: number
  ) {
    const base64Data = canvas
      .toDataURL()
      .replace(/^data:image\/\w+;base64,/, "");
    const dataBuffer = new Buffer(base64Data, "base64");
    return this.saveFile(`${dir}/${name}-${index}.png`, dataBuffer);
  }

  private saveFile(path: string, dataBuffer: Buffer) {
    return new Promise<void>((resolve, reject) => {
      fs.writeFile(path, dataBuffer, function (err) {
        if (err) {
          console.log("保存切图失败", err);
          reject();
        } else {
          console.log("保存切图成功" + path);
          resolve();
        }
      });
    });
  }

  private isFileExist(path) {
    try {
      fs.accessSync(path, fs.F_OK);
    } catch (e) {
      return false;
    }
    return true;
  }
}
</script>

<style lang="scss" scoped>
.header {
  margin-bottom: 10px;

  .size-handle {
    float: right;
    border-bottom: 1px solid rebeccapurple;
    font-style: italic;
  }

  .size-selector {
    position: absolute;
    right: 0;
    width: 220px;
    height: 220px;
    background-color: #bbbbbb;
    display: flex;
    flex-wrap: wrap;
    cursor: pointer;

    .size-selector-item {
      background-color: rgb(161, 104, 218);
      width: 20px;
      height: 20px;
      margin: 1px;
    }

    .selected-item {
      background-color: rebeccapurple;
    }
  }
}

.content {
  display: flex;

  .file-item {
    cursor: pointer;
    margin-top: 4px;
    font-style: italic;
  }

  .file-item:hover {
    color: white;
    background-color: rgb(167, 122, 212);
  }

  .selected-item {
    color: white;
    background-color: rebeccapurple;
  }

  .cut-box {
    margin: 0 auto;
    display: flex;
    flex-wrap: wrap;
  }
}

.footer {
  margin-top: 10px;

  .finish-botton {
    margin-top: 10px;
  }
}
</style>
