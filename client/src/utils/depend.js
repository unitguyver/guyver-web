const dependOne = function (container, address) {
  return new Promise((resolve, reject) => {
    const srcNode = document.createElement("script");
    srcNode.src = address;
    srcNode.onload = resolve;
    srcNode.onerror = reject;
    container.appendChild(srcNode);
  })
}

export default async function depend(list) {
  return await list.$asyncForEach(async (address) => {
    return await dependOne(address);
  })
}