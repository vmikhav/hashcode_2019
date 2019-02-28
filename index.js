'use strict';

const ProgressBar = require('progress');

function compareMaskAnd(a, b, l) {
  let i, result = 0;
  for (i = 0; i < l; i++) {
    if (a[i] === 1 && b[i] === 1) {
      result++;
    }
  }
  return result;
}

function compareMaskOr(a, b, l) {
  let i, result = 0;
  for (i = 0; i < l; i++) {
    if (a[i] === 1 || b[i] === 1) {
      result++;
    }
  }
  return result;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const fs = require('fs');

let fileNames = ['./a_example.txt', './b_lovely_landscapes.txt', './c_memorable_moments.txt', './d_pet_pictures.txt', './e_shiny_selfies.txt'];
let resultNames = ['./a_example_out.txt', './b_lovely_landscapes_out.txt', './c_memorable_moments_out.txt', './d_pet_pictures_out.txt', './e_shiny_selfies_out.txt'];

let taskCode = process.argv[2];

let data = fs.readFileSync(fileNames[taskCode]).toString().split("\n");
let gImages = [];
for (let i = 1; i < data.length - 1; i++) {
  let row = data[i].split(' ');
  if (!row) {break;}
  gImages.push({
    id: i - 1,
    id2: null,
    orient: row[0],
    count: parseInt(row[1]),
    tags: row.slice(2),
    mask: null,
    used: false,
  });
}
data = null;

let tagsIndex = {};
let latestTagIndex = {};
let image;
let images = [];
let imagesV = [];
let imagesH = [];
let i, j, k, t, keys;
let maxUnion, maxUnionPos;
let maxIntersect, maxIntersectPos;
let show = [];
let dataPart = 0;
let resultText;

for (i = 0; i < gImages.length; i++) {
  for (j = 0; j < gImages[i].count; j++) {
    if (!tagsIndex.hasOwnProperty(gImages[i].tags[j].charAt(1))) {
      tagsIndex[gImages[i].tags[j].charAt(1)] = {};
      latestTagIndex[gImages[i].tags[j].charAt(1)] = 0;
    }
    if (!tagsIndex[gImages[i].tags[j].charAt(1)].hasOwnProperty(gImages[i].tags[j])) {
      tagsIndex[gImages[i].tags[j].charAt(1)][gImages[i].tags[j]] = latestTagIndex[gImages[i].tags[j].charAt(1)];
      latestTagIndex[gImages[i].tags[j].charAt(1)]++;
    }
    gImages[i].tags[j] = [gImages[i].tags[j].charAt(1), tagsIndex[gImages[i].tags[j].charAt(1)][gImages[i].tags[j]]];
  }
}
//gImages = shuffle(gImages);
gImages.sort((a, b) => a.count > b.count ? 1 : a.count < b.count ? -1 : 0);;
console.log(Object.keys(tagsIndex).length);


let partSize = 50;
let partCount = Math.ceil(gImages.length / partSize);
console.log('parts count: ' + partCount);

while (gImages.length > 1) {
  dataPart++;
  imagesV = []; imagesH = [];
  k = Math.min(partSize, gImages.length);

  console.log('start part # ' + dataPart + ' / ' + partCount);

  for (i = 0; i < k; i++) {
    image = gImages.pop();
    image.mask = new Int8Array(latestTagIndex);
    image.mask = {};
    if (image.tags === null) {continue; }
    for (j = 0; j < image.count; j++) {
      if (!image.mask.hasOwnProperty(image.tags[j][0])) {
        image.mask[image.tags[j][0]] = new Int8Array(latestTagIndex[image.tags[j][0]]);
      }
      image.mask[image.tags[j][0]][image.tags[j][1]] = 1;
    }
    image.tags = null;
    if (image.orient === 'V') {
      imagesV.push(image);
    } else {
      imagesH.push(image);
    }
  }

  console.log('separate part # ' + dataPart + ' / ' + partCount);

  imagesV.sort((a, b) => a.count > b.count ? 1 : a.count < b.count ? -1 : 0);

  console.log('sort V part # ' + dataPart + ' / ' + partCount);

  for (i = imagesV.length - 1; i > 0; i--) {
    maxUnion = 0;
    keys = Object.keys(imagesV[i].mask);
    for (j = i - 1; j >= 0; j--) {
      k = 0;
      for (t = 0; t < keys.length; t++) {
        if (imagesV[j].mask.hasOwnProperty(keys[t])) {
          k += compareMaskOr(imagesV[i].mask[keys[t]], imagesV[j].mask[keys[t]], latestTagIndex[keys[t]]);
        }
      }
      if (k > maxUnion) {
        maxUnion = k;
        maxUnionPos = j;
        if (maxUnion === imagesV[i].count + imagesV[j].count) {
          break;
        }
      }
    }
    for (t = 0; t < keys.length; t++) {
      if (imagesV[maxUnionPos].mask.hasOwnProperty(keys[t])) {
        for (j = 0; j < latestTagIndex[keys[t]]; j++) {
          if (imagesV[maxUnionPos].mask[keys[t]][j] === 1) {
            imagesV[i].mask[keys[t]][j] = 1;
          }
        }
      }
    }
    keys = Object.keys(imagesV[maxUnionPos].mask);
    for (t = 0; t < keys.length; t++) {
      if (!imagesV[i].mask.hasOwnProperty(keys[t])) {
        imagesV[i].mask[keys[t]] = imagesV[maxUnionPos].mask[keys[t]];
      }
    }

    imagesV[i].id2 = imagesV[maxUnionPos].id;
    imagesV[i].count = maxUnion;
    imagesV.splice(maxUnionPos, 1);
    i--;
  }

  console.log('join V part # ' + dataPart + ' / ' + partCount);

  if (imagesV.length && imagesV[0].id2 === null) {
    gImages.push(imagesV.shift());
  }

  images = imagesH.concat(imagesV);
  images.sort((a, b) => a.count > b.count ? 1 : a.count < b.count ? -1 : 0);

  console.log('sort full part # ' + dataPart + ' / ' + partCount);

  k = images.length - 1;
  if (images[k].id2 === null) {
    show.push(images[k].id);
  } else {
    show.push(images[k].id + ' ' + images[k].id2);
  }

  let bar = new ProgressBar(':bar :percent :etas', { total: images.length - 2 });
  for (i = images.length - 1; i > 0; i--) {
    maxIntersect = -1;
    keys = Object.keys(images[i].mask);
    for (j = i - 1; j >= 0; j--) {
      k = 0;
      for (t = 0; t < keys.length; t++) {
        if (images[j].mask.hasOwnProperty(keys[t])) {
          k += compareMaskAnd(images[i].mask[keys[t]], images[j].mask[keys[t]], latestTagIndex[keys[t]]);
        }
      }
      if (k > maxIntersect) {
        maxIntersect = k;
        maxIntersectPos = j;
        if (maxIntersect === images[i].count + images[j].count) {
          break;
        }
      }
    }
    images[i] = images[maxIntersectPos];
    if (images[i].id2 === null) {
      show.push(images[i].id);
    } else {
      show.push(images[i].id + ' ' + images[i].id2);
    }
    images.splice(maxIntersectPos, 1);
    bar.tick(1, null);
  }
}

resultText = show.length + '\n' + show.join('\n');

fs.writeFile(resultNames[taskCode], resultText, function(err) {
  if(err) {
    return console.log(err);
  }

  console.log("The file was saved!");
});

