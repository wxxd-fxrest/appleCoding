require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const app = express(); 
app.use(bodyParser.urlencoded({extended : true}));
const MongoClient = require('mongodb').MongoClient;
app.set('view engine', 'ejs');
const methodOverride = require('method-override');
app.use(methodOverride('_method'));

app.listen(process.env.PORT, () => {
    console.log('listening on 8080');
}); 

let db;
MongoClient.connect(
    process.env.DB_URL, 
    (error, client) => {
        if(error) return console.log(error);
        db = client.db('todo');
});

app.get('/write', (request, answer) => {
    answer.render('write.ejs');
}); 

app.get('/edit/:id', (request, answer) => {
    db.collection('post').findOne(
        {_id: parseInt(request.params.id)}, 
        (error, result) => {
            if(error) return console.log(error);
            answer.render('edit.ejs', {data: result});
    });
}); 

app.put('/edit', (request, answer) => {
    db.collection('post').updateOne(
        {_id: parseInt(request.body.id)}, 
        {$set: {title: request.body.title}}, 
        (error, result) => {
            if(error) return console.log(error);
            answer.redirect('/list');
    });
});

app.get('/detail/:id', (request, answer) => {
    db.collection('post').findOne({_id: parseInt(request.params.id)}, (error, result) => {
        if(error) return console.log(error);
        answer.render('detail.ejs', {data: result});
        // console.log(result);
    });
}); 


app.get('/list', (request, answer) => {
    db.collection('post').find().toArray((error, result) => { 
        // post 모든 데이터 가져오기
        // console.log(result);
        answer.render('list.ejs', {POSTS: result});
    }); 
}); 

app.get('/search', (request, answer) => {
    let seachData = [{
        $search: {
            index: 'titleSearch',
            text: {
              query: request.query.value,
              path: 'title'  // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
            }
        }
    }, {$sort: { _id: 1 }}]; 
    db.collection('post').aggregate(seachData).toArray((error, result) => {
        answer.render('search.ejs', {SEARCH: result})
        // console.log(result);
    });
})

app.delete('/delete', (request, answer) => {
    request.body._id = parseInt(request.body._id);
    let deleteData = {
        _id: request.body._id,
        userID: request.user.result._id,
    };
    db.collection('post').deleteOne(deleteData, (error, result) => {
        if(error) return console.log(error);
        console.log('삭제 완료');
        answer.status(200).send({message: '삭제가 진행되었습니다.'});
    });
});

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const { request } = require('express');

app.use(session({secret: 'secretCode', resave: true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());




passport.use(new LocalStrategy({
        usernameField: 'id',
        passwordField: 'pw',
        session: true,
        passReqToCallback: false,
    }, (inputID, inputPW, done) => {
    db.collection('login').findOne({ id: inputID }, 
        (error, result) => {
            if (error) return done(error)
        
            if (!result) return done(null, false, { message: '존재하지않는 아이디요' })
            if (inputPW == result.pw) {
                return done(null, result)
            } else {
                return done(null, false, { message: '비번틀렸어요' })
            }
    });
    // console.log(inputID, inputPW);
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((userID, done) => {
    db.collection('login').findOne({id: userID}, (error, result) => {
        done(null, {result});
    });
});

app.get('/login', (request, answer) => {
    answer.render('login.ejs');
});

app.post('/login', passport.authenticate('local', {
    failureRedirect: '/fail'
}), (request, answer) => {
    answer.redirect('/mypage');
});

app.post('/register', (request, answer) => {
    db.collection('login').insertOne(
        {id: request.body.id, pw: request.body.pw}, 
        (error, result) => {
            answer.redirect('/list');
    });
});

app.get('/mypage', userLogin, (request, answer) => {
    answer.render('mypage.ejs', {userData: request.user});
    console.log(request.user)
});

app.post('/add', (request, answer) => {
            
    db.collection('counter').findOne({name: '게시물 갯수'}, 
    (error, result) => {
        console.log(result.totalPost);
        let totalID = result.totalPost;

        let Save = {
            _id: totalID,
            userID: request.user.result._id,
            title: request.body.title, 
            date: request.body.date,
        }; 

        db.collection('post').insertOne(Save, (error, result) => {
            console.log('save');
            db.collection('counter').updateOne(
                {name: '게시물 갯수'}, {$set : {totalPost: totalID + 1}}, // $set >> 바꿔주세요~ 할 때 쓰는 연산자
                (error, result) => {
                    if(error) return console.log(error);
                    answer.redirect('/list');
            });
        });
    }); 
}); 


app.use('/shop', userLogin, require('./routes/shop'));
// app.use == 미들웨어 사용 

function userLogin (request, answer, next) {
    if(request.user) {
        next();
    } else {
        answer.send('미로그인');
    }
}; 

let multer = require('multer');
let storage = multer.diskStorage({
    destination : function(req, file, cb) {
        cb(null, './public/image');
    },
    filename : function(req, file, cb) {
        cb(null, file.originalname);
    },
});

let upload = multer({storage : storage});

app.get('/upload', (request, answer) => {
    answer.render('upload.ejs');
});

app.post('/upload', upload.single('profile'), (request, answer) => {
    answer.send('upload');
});

app.get('/image/:imageName', (request, answer) => {
    answer.sendFile( __dirname + '/public/image/' + request.params.imageName ); 
}); 
