import { authApi } from './auth';
import { usersApi } from './users';
import { productsApi } from './products';
import { ordersApi } from './orders';
import { paymentApi } from './payment';
import { socialApi } from './social';
import { notificationsApi } from './notifications';
import { chatApi } from './chat';
import { inventoryApi } from './inventory';
import { uploadApi } from './upload';
import { cartApi } from './cart';
import { miscApi } from './misc';
import { reviewsApi } from './reviews';
import { shippingApi } from './shipping';

export { registerUnauthorizedHandler } from './client';

export const api = {
  auth: authApi,
  users: usersApi,
  shipping: shippingApi,
  products: productsApi,
  orders: ordersApi,
  payment: paymentApi,
  social: socialApi,
  notifications: notificationsApi,
  chat: chatApi,
  inventory: inventoryApi,
  upload: uploadApi,
  cart: cartApi,
  misc: miscApi,
  reviews: reviewsApi,
};
