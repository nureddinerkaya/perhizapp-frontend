import { useState, useEffect } from "react";

export default function useFoodList() {
  const [foodList, setFoodList] = useState([]);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    fetch(`${baseUrl}/api/food/getAll`)
      .then((res) => res.json())
      .then(setFoodList);
  }, []);

  return foodList;
}
