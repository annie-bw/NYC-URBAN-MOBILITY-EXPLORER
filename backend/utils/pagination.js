const getPagination = (page = 1, limit = 50) => {
  page = parseInt(page);
  limit = parseInt(limit);

  const offset = (page - 1) * limit;

  return { limit, offset, page };
};

module.exports = getPagination;
