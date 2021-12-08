/**
 * @author guyver
 * @date 2021/09/27 17:32
 * @description 防止遍历数组时删除元素影响结果
 */
Array.prototype.$forEach = function (callback) {
  this.concat().forEach((item, index) => callback.call(this, item, index));
}

/**
 * @author guyver
 * @date 2021/09/27 17:31
 * @description 异步遍历数组
 * @param {asyncCallback} 异步函数
 * @return
 */
Array.prototype.$asyncForEach = async function (asyncCallback) {
  const copyArr = this.concat();
  let len = 0;
  const single = async function (asyncCallback) {
    if (len < copyArr.length) {
      await asyncCallback(copyArr[len], len++);
      await single(asyncCallback)
    }
  }
  await single(asyncCallback);
}

/**
 * @author guyver
 * @date 2021/10/05 10:43
 * @description 异步map
 */
Array.prototype.$asyncMap = async function (asyncCallback) {
  let result = [];
  await this.$asyncForEach(async (item, index) => {
    result.push(await asyncCallback(item, index));
  });
  return result;
}

/**
 * @author guyver
 * @date 2021/10/05 10:43
 * @description 异步处理
 */
Array.prototype.$asyncReduce = async function (asyncCallback, temp) {
  await this.$asyncForEach(async (item, index) => {
    temp = await asyncCallback(temp, item, index)
  });
  return temp;
}