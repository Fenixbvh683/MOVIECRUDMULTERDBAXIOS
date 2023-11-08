const db = require('../database/models');
const paginate = require('express-paginate');
const moment = require('moment');
const { Op } = require('sequelize');

const translatte = require('translatte')

const axios = require('axios');
const URL_BASE = 'https://www.omdbapi.com/?&apikey=35f30a1'

const moviesController = {
    list: (req, res) => {

        db.Movie.findAndCountAll({
            include : ['genre'],
            limit : req.query.limit,
            offset : req.skip
        })       
            .then(({count, rows}) => {

                const pagesCount = Math.ceil(count / req.query.limit)

                res.render('moviesList', {
                    movies : rows, 
                    pages : paginate.getArrayPages(req)(pagesCount, pagesCount, req.query.page),
                    paginate,
                    pagesCount,
                    currentPage : req.query.page,
                    result : 0
                });
            });
    },
    detail: (req, res) => {
        db.Movie.findByPk(req.params.id, {
            include : ['actors']
        }).then(movie => {
            return res.render('moviesDetail', {...movie.dataValues, moment});
            });
    },
    new: (req, res) => {
        db.Movie.findAll({
            order : [
                ['release_date', 'DESC']
            ],
            limit: 5
        })
            .then(movies => {
                res.render('newestMovies', {movies});
            });
    },
    recomended: (req, res) => {
        db.Movie.findAll({
            where: {
                rating: {[db.Sequelize.Op.gte] : 8}
            },
            order: [
                ['rating', 'DESC']
            ]
        })
            .then(movies => {
                res.render('recommendedMovies', {movies});
            });
    },
    //Aqui dispongo las rutas para trabajar con el CRUD
    add: function (req, res) {
    const actors = db.Actor.findAll({
            order: [
                ['first_name'],
                ['last_name'],
        ]
        })
        const genres = db.Genre.findAll({
            order : ["name"],
        })

        Promise.all([actors, genres])

        .then(([actors, genres]) => {
            return res.render('moviesAdd', {
                genres,
                actors
            });
        })
        .catch(error => console.log(error))
    },
    create: function (req,res) {

        const { title, rating, awards, release_date, length, genre_id} = req.body;

        const actors = [req.body.actors].flat();

        db.Movie.create({
            title : title.trim(),
            rating, 
            awards,
            release_date,
            length,
            genre_id,
            image : req.file ? req.file.filename : null
        })
        .then((movie) => {

            if(actors){
            
                const actorsDB = actors.map(actor => {
                    return {
                        movie_id : movie.id,
                        actor_id : actor
                    }
                })

                db.Actor_Movie.bulkCreate(actorsDB, {
                    validate : true
                }).then(() => {console.log('Actores Agregados Correctamente')
                return res.redirect("/movies");
            })
            }else{
                return res.rediect("/movies")
            }
            
        })
        .catch((error) => console.log(error));
    },
    edit: function(req,res) {
    const genres = db.Genre.findAll({
            order: ["name"],
        })
        const movie = db.Movie.findByPk(req.params.id, {
            include : ['actors']
        });

        const actors = db.Actor.findAll({
            order : [
                ['first_name', 'ASC'],
                ['last_name', 'ASC']
            ]
        });

        Promise.all([genres, movie, actors])
        .then(([genres, movie, actors]) => {
            return res.render('moviesEdit', {
                genres,
                movie,
                actors,
                moment
            });
        })
        .catch(error => console.log(error))
    },
    update: function (req,res) {
        
        let {title, awards, rating, length, release_date, genre_id, actors} = req.body;
        actors = typeof actors === 'string' ? [actors] : actors
            db.Movie.update(
                {
                    title : title.trim(),
                    awards,
                    rating,
                    release_date,
                    length,
                    genre_id,
                    image : req.file ? req.file.filename : null
                },
                {
                    where : {
                        id : req.params.id
                    }
                }
            )
            .then(() => {
                db.Actor_Movie.destroy({
                    where : {
                        movie_id : req.params.id
                    }
                }).then(() => {
                    
                    if(actors){
            
                    const actorsDB = actors.map(actor => {
                        return {
                            movie_id : req.params.id,
                            actor_id : actor
                        }
                    })

                    db.Actor_Movie.bulkCreate(actorsDB, {
                        validate : true
                    }).then(() => console.log('Actores Agregados Correctamente'))
                }
            })  
        })
        .catch(error => console.log(error))
        .finally(() => res.redirect('/movies'))           
    },
    delete: function (req,res) {

    },
    destroy: function (req,res) {
        db.Actor_Movie.destroy({
            where : {
                movie_id : req.params.id
            }
        })
        .then(() =>{

            db.Actor.update(
                {
                    favorite_movie_id : null
                },
                {
                    where : {
                        favorite_movie_id : req.params.id
                    }
                }
            )
            .then(()=> {

            })
        })

        db.Movie.destroy({
            where : {
                id : req.params.id
            }
        })
        .then(()=> {
            return res.redirect('/movies')
        })
        .catch((error) => console.log(error))
    },

    search : (req,res) => {
        const keyword = req.query.keyword

        if(keyword){

            db.Movie.findAll({
                where : {
                    title : {
                        [Op.substring] : keyword
                    }
                }
            }).then( movies => {

                if (!movies.length) {

                    axios.get(`${URL_BASE}&t=${keyword}`)
                    .then(async response => {

                        const {Title, Released, Genre, Ratings, Awards, Poster} = response.data

                        const awardsArray = Awards.match(/\d+/g);
                        const awardsParseado = awardsArray.map(awards => + awards)
                        const awards = awardsParseado.reduce((acum, num) => acum + +num, 0)

                        const rating = Ratings[0].Value.split('/')[0]

                        const release_date = moment(Released).toDate();

                        const image = Poster

                        const newGenre = Genre.split(',')[0]

                        let genre_id;

                        if(newGenre){

                            const {text} = await translatte(newGenre, {to:'es'})

                            const genres = await db.Genre.findAll({order : [['ranking', 'DESC']]})

                            const [genre, genreCreated] = await db.Genre.findOrCreate({
                                where: {name : text},
                                defaults : {
                                    active : 1,
                                    ranking : genres[0].ranking + 1

                                }
                            });
                            genre_id = genre.id
                        }

                        let newMovie = {
                            title : Title,
                            awards,
                            rating,
                            release_date,
                            image,
                            genre_id
                        }

                        db.Movie.create(newMovie)
                        .then(() => {
                            db.Movie.findAll({
                                where : {
                                    title : {
                                        [Op.substring] : keyword
                                    }
                                }
                            })
                            .then(movies => {
                                return res.render('moviesListSearch', {movies, result : 1});
                            })
                        })
                    })

                } else {
                    return res.render('moviesListSearch', {movies, result : 1});
                }
                        
            }).catch(error => console.log(error))

        }else {
            
            db.Movie.findAndCountAll({
                include : ['genre'],
                limit : req.query.limit,
                offset : req.skip
            })       
                .then(({count, rows}) => {
    
                    const pagesCount = Math.ceil(count / req.query.limit)
    
                    res.render('moviesList', {
                        movies : rows, 
                        pages : paginate.getArrayPages(req)(pagesCount, pagesCount, req.query.page),
                        paginate,
                        pagesCount,
                        currentPage : req.query.page,
                    });
                });

        }
    }
        
};

module.exports = moviesController;