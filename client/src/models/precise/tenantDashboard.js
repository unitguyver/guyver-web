import modelExtend from 'dva-model-extend';
import { pageModel } from '@/utils/model';

export default modelExtend(pageModel, {
    namespace: 'tenantDashboard',

    state: {

    },

    subscriptions: {
        setup({ dispatch, history }) {
            history.listen(location => {

            })
        },
    },

    effects: {

    },

    reducers: {

    },
})
