import { findPortfolio, reviewAll, reviewByPage } from '@/api/review.js'

/* 리뷰 관련 상태 관리(vuex) */
const reviewStore = {
    namespaced: true,
    state: {
        reviewStatus: false,
        portfolioStatus: false,
        portfolioData: {},
        reviews: {},
        someReviews: {}
    },
    getters: {
        getReviewStatus: (state) => state.reviewStatus,
        getPortfolioStatus: (state) => state.portfolioStatus,
        getReviews: (state) => state.reviews,
        getSomeReviews: (state) => state.someReviews,
        getPortfolioData: (state) => state.portfolioData,
    },
    mutations: {
        SET_REVIEW_STATUS: (state, status) => state.reviewStatus = status,
        SET_PORTFOLIO_STATUS: (state, status) => state.portfolioStatus = status,
        SET_REVEIW_LIST: (state, reviews) => state.reviews = reviews,
        SET_SOME_REVEIW_LIST: (state, someReviews) => state.someReviews = someReviews,
        SET_PORTFOLIO_DATA: (state, portfolioData) => state.portfolioData = portfolioData,
    },
    actions: {
        async importAllReviews({commit}, nickname) {
            await reviewAll(nickname, (response) => {
                if(response.status == 200) {
                    commit("SET_REVEIW_LIST", response.data);
                    commit("SET_REVIEW_STATUS", true);
                }
            },
            () => {
            });
        },
        async findPortfolioStatus({commit}, nickname) {
            commit("SET_PORTFOLIO_STATUS", false);
            commit("SET_PORTFOLIO_DATA", {});
            await findPortfolio(nickname, (response) => {
                if(response.status == 200) {
                    commit("SET_PORTFOLIO_STATUS", true);
                    commit("SET_PORTFOLIO_DATA", response.data);
                    console.log(response.data)
                }
            },
            () => {
            });
        },
        async fineReviewsByPage({commit}, info) {
            await reviewByPage(info, (response) => {
                if(response.status == 200) {
                    commit("SET_SOME_REVEIW_LIST", response.data);
                }
            },
            () => {
            })
        }
    },
    modules: {

    }
};


export default reviewStore;