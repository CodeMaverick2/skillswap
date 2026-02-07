const successResponse = (data = null, message = 'Success', meta = {}) => ({
  success: true,
  message,
  data,
  ...(Object.keys(meta).length && { meta }),
});

const errorResponse = (message = 'Something went wrong', errors = null) => ({
  success: false,
  message,
  ...(errors && { errors }),
});

const paginatedResponse = (data, page, limit, total) => ({
  success: true,
  data,
  meta: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
  },
});

module.exports = { successResponse, errorResponse, paginatedResponse };
