const normalizeEmployeeResponse = (data) => {
  if (!data) return null;

  // Backend format: { success:true, Result:{} }
  if (data.success && typeof data.Result === "object") {
    return data.Result;
  }

  // Some APIs return: { success:true, employee:{} }
  if (data.success && typeof data.employee === "object") {
    return data.employee;
  }

  return null;
};
