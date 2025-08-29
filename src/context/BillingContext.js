// context/BillingContext.js
import { createContext, useContext, useState } from "react";

const BillingContext = createContext();
export const useBilling = () => useContext(BillingContext);

export const BillingProvider = ({ children }) => {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [products, setProducts] = useState([]); // store products with stock

  const loadProducts = (productList) => setProducts(productList);

    const addProduct = (product) => {
        setCart((prevCart) => {
            // Check if same product id AND selling price already exists
            const existing = prevCart.find(
                (item) => item.id === product.id && item.sellingPrice === product.sellingPrice
            );

            if (existing) {
                // increase quantity if same selling price
                return prevCart.map((item) =>
                    item.id === product.id && item.sellingPrice === product.sellingPrice
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            } else {
                // add as a new line item if selling price is different
                return [...prevCart, { ...product, quantity: 1 }];
            }
        });
    };


  const removeProduct = (productId) => {
    const removedItem = cart.find(item => item.id === productId);
    if (removedItem) {
      // return stock to product list
      setProducts(prev =>
        prev.map(p =>
          p.id === removedItem.id ? { ...p, stock: p.stock + removedItem.quantity } : p
        )
      );
    }
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const clearBill = () => {
    setSelectedCustomer(null);
    setCart([]);
    setPaymentMethod('CASH');
    // optional: reset product stocks to original by refetching
  };

  return (
    <BillingContext.Provider
      value={{
        selectedCustomer, setSelectedCustomer,
        cart, addProduct, removeProduct,
        paymentMethod, setPaymentMethod,
        clearBill, products, loadProducts
      }}
    >
      {children}
    </BillingContext.Provider>
  );
};
