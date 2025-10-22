import axios from 'axios';
import { API } from '../../config';

export const GET = (URL, config = {}) => {
  const Token = localStorage.getItem("Token")
  return axios({
    method: 'GET',
    url: `${API}${URL}`,
    headers: {
      'Authorization': 'Bearer ' + Token,
      'Content-Type': 'application/json',
      ...config.headers, // เพิ่มได้ตรงนี้
    },
    ...config,
  }).then(res => res.data).catch(err => ({
    error: err,
    message: err?.response?.data?.message || ""
  }));
};
export const POST = (URL, data) => {
  const Token = localStorage.getItem("Token")
  console.log("first", `${API}${URL}`)
  return axios({
    method: 'POST',
    url: `${API}${URL}`,
    data: data,
    headers: {
      'Authorization': 'Bearer ' + Token,
      'Content-Type': 'application/json'
    },
  }).then((result) => {
    // console.log('getCookie', result.data)
    // console.log("token",Token)
    return result.data

  }).catch(err => {
    console.log(err);
    return { error: err, message: err?.response?.data?.message || "" }
  });
}
export const PUT = (URL, data) => {
  const Token = localStorage.getItem("Token")
  return axios({
    method: 'PUT',
    url: `${API}${URL}`,
    data: data,
    headers: {
      'Authorization': 'Bearer ' + Token,
      'Content-Type': 'application/json'
    },
  }).then((result) => {
    // console.log('getCookie', result.data)
    return result.data

  }).catch(err => {
    console.log(err);
    return { error: err, message: err?.response?.data?.message || "" }
  });
}
export const DELETE = (URL) => {
  const Token = localStorage.getItem("Token")
  return axios({
    method: 'DELETE',
    url: `${API}${URL}`,
    // data: data,
    headers: {
      'Authorization': 'Bearer ' + Token,
      'Content-Type': 'application/json'
    },
  }).then((result) => {
    // console.log('getCookie', result.data)
    return result.data

  }).catch(err => {
    console.log(err);
    return { error: err, message: err?.response?.data?.message || "" }
  });
}
export const UPLOAD = (URL, { files, fields = {}, fieldName = 'images', onProgress, signal } = {}, config = {}) => {
  const Token = localStorage.getItem('Token');
  const form = new FormData();

  // ⬇️ สำคัญ: ถ้าเป็นหลายไฟล์ ให้ append ด้วย "images" ซ้ำ ๆ ตามสเปค API
  if (Array.isArray(files)) {
    files.forEach((f, i) => f && form.append(fieldName, f, f.name || `file_${i}`));
  } else if (files) {
    form.append(fieldName, files, files.name || 'file');
  }

  // แนบฟิลด์อื่น ๆ ถ้ามี
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));

  // อย่าตั้ง Content-Type เอง ปล่อยให้ browser ใส่ boundary
  return axios({
    method: 'POST',
    url: `${API}${URL}`,
    data: form,
    headers: {
      Authorization: 'Bearer ' + Token,
      ...(config.headers || {}),
    },
    onUploadProgress: (e) => {
      if (typeof onProgress === 'function' && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total), e);
      }
    },
    signal,
    ...config,
  })
    .then(res => res.data)
    .catch(err => ({ error: err, message: err?.response?.data?.message || '' }));
};