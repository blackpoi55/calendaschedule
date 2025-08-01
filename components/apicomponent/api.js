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
