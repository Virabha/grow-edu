"use client";
import { useCart as useCartQuery, useAddToCart as useAddToCartMutation, useRemoveFromCart as useRemoveFromCartMutation, useClearCart as useClearCartMutation } from "@/lib/hooks/use-data";
export const useCart = () => useCartQuery();
export const useAddToCart = () => {
    const mutation = useAddToCartMutation();
    return mutation;
};
export const useRemoveFromCart = () => {
    const mutation = useRemoveFromCartMutation();
    return mutation;
};
export const useClearCart = () => {
    const mutation = useClearCartMutation();
    return mutation;
};
