/** 「我的账号」接口：资料自助修改与改密 */

import { api } from "./client";

export function myProfile() {
  return api.get("/auth/profile");
}

export function updateMyProfile(payload) {
  return api.patch("/auth/profile", payload);
}

/** 没设过密码的账号不用传 oldPassword（服务端会放过） */
export function changeMyPassword(oldPassword, newPassword) {
  return api.post("/auth/change-password", {
    oldPassword: oldPassword || undefined,
    newPassword
  });
}
