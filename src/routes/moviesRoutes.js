const express = require('express');
const router = express.Router();
const {list, new : newest, recomended, detail, add, create, edit, update, delete : remove, destroy, search } = require('../controllers/moviesController');
const { uploadOneImage } = require('../middlewares/upload');

router
    .get('/movies', list)
    .get('/movies/new', newest)
    .get('/movies/recommended', recomended)
    .get('/movies/detail/:id', detail)
//Rutas exigidas para la creación del CRUD
    .get('/movies/add', add)
    .post('/movies/create',uploadOneImage.single('image'), create)
    .get('/movies/edit/:id', edit)
    .put('/movies/update/:id',uploadOneImage.single('image'), update)
    .get('/movies/delete/:id', remove)
    .delete('/movies/delete/:id', destroy)
    .get('/movies/search', search)

module.exports = router;